import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
path = Path('C:/Users/hp/Downloads/INTERNS HIRING TASK ASSIGNMENT.docx')
with zipfile.ZipFile(path) as doc:
    xml = doc.read('word/document.xml')
root = ET.fromstring(xml)
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
text = []
for para in root.findall('.//w:p', ns):
    runs = ''.join(node.text or '' for node in para.findall('.//w:t', ns))
    if runs.strip():
        text.append(runs.strip())
print('\n\n'.join(text))
