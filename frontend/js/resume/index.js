// Browser entry for resume generation. Everything happens locally: the job description and the
// resulting PDF never leave this page and are not written to any storage.
import { buildModel } from "./tailor.js";
import { makePDF } from "./pdf.js";

let profilePromise;
const loadProfile = () => (profilePromise ||= fetch("data/profile.json").then((r) => {
  if (!r.ok) throw new Error(`profile.json: ${r.status}`);
  return r.json();
}));

let libPromise;
function loadPdfLib() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  return (libPromise ||= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "vendor/jspdf.umd.min.js";
    s.onload = () => resolve(window.jspdf.jsPDF);
    s.onerror = () => { libPromise = null; reject(new Error("Could not load the PDF library")); };
    document.head.append(s);
  }));
}

/** Builds a PDF. Pass a job description to tailor it; omit for the general resume. */
export async function createResume(jobDescription = null) {
  const [profile, JsPDF] = await Promise.all([loadProfile(), loadPdfLib()]);
  const { model, report } = buildModel(profile, jobDescription);
  const { doc } = makePDF(JsPDF, model);
  return { blob: doc.output("blob"), report };
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
