import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { renderArticleBody } from "../../lib/articleBody";
import {
  Bold,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Underline as UnderlineIcon,
  Upload,
} from "lucide-react";
import api from "../../lib/axios";

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function safeLinkUrl(value) {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function normalizeImageUrl(value) {
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;

    if (url.hostname === "drive.google.com") {
      const fileId = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || url.searchParams.get("id");
      if (fileId) {
        url.pathname = "/uc";
        url.search = "";
        url.searchParams.set("export", "view");
        url.searchParams.set("id", fileId);
      }
    }

    return url.href;
  } catch {
    return null;
  }
}

function ToolbarButton({ label, active = false, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded border text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800 ${active ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950" : "border-transparent"}`}
    >
      {children}
    </button>
  );
}

export default function ArticleBodyEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const emittedContentRef = useRef(value);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const insertImageUrl = (valueToInsert, position) => {
    const editor = editorRef.current;
    const src = normalizeImageUrl(valueToInsert);
    if (!editor || !src) {
      setError("Enter a valid HTTP or HTTPS image URL.");
      return false;
    }
    setError("");
    const chain = editor.chain().focus();
    if (Number.isInteger(position)) chain.setTextSelection(position);
    chain.setImage({ src, alt: "" }).run();
    return true;
  };

  const uploadImages = async (files, position) => {
    const images = [...files].filter((file) => imageMimeTypes.has(file.type));
    if (!images.length) {
      setError("Choose a JPG, PNG, GIF, or WebP image.");
      return;
    }

    setError("");
    for (const file of images) {
      const formData = new FormData();
      formData.append("image", file);
      setUploading((count) => count + 1);
      try {
        const { data } = await api.post("/api/admin/articles/image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        insertImageUrl(data.url, position);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to upload this image.");
      } finally {
        setUploading((count) => count - 1);
      }
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Image.configure({ allowBase64: false }),
    ],
    content: renderArticleBody(value),
    immediatelyRender: false,
    onUpdate: ({ editor: currentEditor }) => {
      const content = currentEditor.getHTML();
      emittedContentRef.current = content;
      onChangeRef.current(content);
    },
    editorProps: {
      attributes: {
        class: "min-h-64 px-4 py-3 text-sm leading-7 outline-none [&_a]:text-blue-700 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-md [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_ul]:list-disc",
      },
      handleDrop: (view, event) => {
        const files = [...(event.dataTransfer?.files || [])].filter((file) => imageMimeTypes.has(file.type));
        if (!files.length) return false;
        event.preventDefault();
        const position = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        uploadImages(files, position);
        return true;
      },
      handlePaste: (view, event) => {
        const files = [...(event.clipboardData?.files || [])].filter((file) => imageMimeTypes.has(file.type));
        if (files.length) {
          event.preventDefault();
          uploadImages(files, view.state.selection.from);
          return true;
        }

        const pastedText = event.clipboardData?.getData("text/plain")?.trim();
        if (pastedText && /^https?:\/\//i.test(pastedText) && /(drive\.google\.com|\.(jpe?g|png|gif|webp)(?:[?#]|$))/i.test(pastedText)) {
          event.preventDefault();
          insertImageUrl(pastedText, view.state.selection.from);
          return true;
        }
        return false;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor || value === emittedContentRef.current) return;
    const content = renderArticleBody(value);
    emittedContentRef.current = value;
    if (content !== editor.getHTML()) editor.commands.setContent(content, { emitUpdate: false });
  }, [editor, value]);

  const addLink = () => {
    if (!editor) return;
    const valueToLink = window.prompt("Enter the link URL");
    if (!valueToLink) return;
    const href = safeLinkUrl(valueToLink);
    if (!href) {
      setError("Links must use HTTP, HTTPS, or mailto.");
      return;
    }

    setError("");
    const { empty } = editor.state.selection;
    if (empty) {
      editor.chain().focus().insertContent({
        type: "text",
        text: valueToLink.trim(),
        marks: [{ type: "link", attrs: { href, target: "_blank", rel: "noopener noreferrer" } }],
      }).run();
    } else {
      editor.chain().focus().setLink({ href, target: "_blank", rel: "noopener noreferrer" }).run();
    }
  };

  const addImageUrl = () => {
    const src = window.prompt("Enter a public image URL");
    if (src) insertImageUrl(src);
  };

  return (
    <div className="overflow-hidden rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 p-2 dark:border-slate-700">
        <ToolbarButton label="Bold" active={editor?.isActive("bold")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={17} /></ToolbarButton>
        <ToolbarButton label="Italic" active={editor?.isActive("italic")} disabled={!editor} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={17} /></ToolbarButton>
        <ToolbarButton label="Underline" active={editor?.isActive("underline")} disabled={!editor} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon size={17} /></ToolbarButton>
        <ToolbarButton label="Heading" active={editor?.isActive("heading", { level: 2 })} disabled={!editor} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></ToolbarButton>
        <ToolbarButton label="Bulleted list" active={editor?.isActive("bulletList")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={17} /></ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor?.isActive("orderedList")} disabled={!editor} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></ToolbarButton>
        <ToolbarButton label="Quote" active={editor?.isActive("blockquote")} disabled={!editor} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={17} /></ToolbarButton>
        <span className="mx-1 h-6 border-l border-slate-200 dark:border-slate-700" />
        <ToolbarButton label="Add link" active={editor?.isActive("link")} disabled={!editor} onClick={addLink}><Link2 size={17} /></ToolbarButton>
        <ToolbarButton label="Add image URL" disabled={!editor} onClick={addImageUrl}><ImagePlus size={17} /></ToolbarButton>
        <ToolbarButton label="Upload image" disabled={!editor || uploading > 0} onClick={() => fileInputRef.current?.click()}><Upload size={17} /></ToolbarButton>
        {uploading > 0 && <span role="status" className="ml-2 text-xs text-slate-500">Uploading image...</span>}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) uploadImages(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      <EditorContent editor={editor} />
      {error && <p role="alert" className="border-t border-red-200 px-4 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}