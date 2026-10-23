"""Export Python's standard-library module list and reference import analyses (from Python's own
ast parser) so scripts/check_deps_parity.mjs can verify the browser port in js/py-deps.js."""
import ast, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "Vishnu_Projects"
std = sorted(sys.stdlib_module_names)
(ROOT / "data/py_stdlib.json").write_text(json.dumps(std))

def imports(src):
    out = set()
    for n in ast.walk(ast.parse(src)):
        if isinstance(n, ast.Import):
            out |= {a.name.split(".")[0] for a in n.names}
        elif isinstance(n, ast.ImportFrom) and n.module and n.level == 0:
            out.add(n.module.split(".")[0])
    return sorted(out)

sources = [(PROJECTS / "mlops-agent/sample_model.py").read_text()]
sources += [
    "import os, sys\nimport numpy as np, pandas as pd\nfrom sklearn.svm import SVC\n",
    "from . import local\nfrom .utils import f\nimport torch.nn as nn\n",
    '"""import fake_in_docstring"""\n# import fake_comment\nimport yaml\nimport cv2  # opencv\n',
    "def f():\n    import platform\n    from PIL import Image\n    import bs4, dotenv\n",
    "try:\n    import xgboost\nexcept ImportError:\n    xgboost = None\nfrom typing import List\nimport tensorflow.keras.layers\n",
]
cases = [{"source": s, "imports": imports(s)} for s in sources]
(ROOT / "data/deps_cases.json").write_text(json.dumps(cases))
print(len(std), "stdlib modules;", len(cases), "cases")
