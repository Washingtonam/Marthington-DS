import pathlib, re
text = pathlib.Path("package-lock.json").read_text()
matches = list(re.finditer(r"\\\"version\\\"\\s*:\\s*\\\"(.*?)\\\"", text))
print(len(matches))
print([m.group(1) for m in matches[:10]])
