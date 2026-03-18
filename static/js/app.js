/* IndicConvert — Frontend Logic */

(function () {
    "use strict";

    // --- Hero Animation ---
    const HERO_PHRASES = [
        // Pass 1: "Perfectly converted" in each language
        { text: "Perfectly Converted", lang: "English" },
        { text: "ਸੰਪੂਰਨ ਰੂਪਾਂਤਰਿਤ", lang: "Punjabi" },
        { text: "पूर्ण रूपांतरित", lang: "Hindi" },
        { text: "সম্পূর্ণ রূপান্তরিত", lang: "Bengali" },
        { text: "முழுமையாக மாற்றப்பட்டது", lang: "Tamil" },
        { text: "సంపూర్ణంగా మార్చబడింది", lang: "Telugu" },
        { text: "ಸಂಪೂರ್ಣವಾಗಿ ಪರಿವರ್ತಿಸಲಾಗಿದೆ", lang: "Kannada" },
        { text: "പൂർണ്ണമായി പരിവർത്തനം", lang: "Malayalam" },
        { text: "સંપૂર્ણ રૂપાંતરિત", lang: "Gujarati" },
        { text: "ସମ୍ପୂର୍ଣ୍ଣ ରୂପାନ୍ତରିତ", lang: "Odia" },
        // Pass 2: "Your files are safe" in each language
        { text: "Your Files Are Safe", lang: "English" },
        { text: "ਤੁਹਾਡੀਆਂ ਫਾਈਲਾਂ ਸੁਰੱਖਿਅਤ ਹਨ", lang: "Punjabi" },
        { text: "आपकी फ़ाइलें सुरक्षित हैं", lang: "Hindi" },
        { text: "আপনার ফাইল নিরাপদ", lang: "Bengali" },
        { text: "உங்கள் கோப்புகள் பாதுகாப்பானவை", lang: "Tamil" },
        { text: "మీ ఫైళ్లు సురక్షితం", lang: "Telugu" },
        { text: "ನಿಮ್ಮ ಫೈಲ್‌ಗಳು ಸುರಕ್ಷಿತ", lang: "Kannada" },
        { text: "നിങ്ങളുടെ ഫയലുകൾ സുരക്ഷിതം", lang: "Malayalam" },
        { text: "તમારી ફાઇલો સુરક્ષિત છે", lang: "Gujarati" },
        { text: "ଆପଣଙ୍କ ଫାଇଲ୍ ସୁରକ୍ଷିତ", lang: "Odia" },
    ];

    const heroText = document.getElementById("heroText");
    let heroIndex = 0;
    let heroRunning = true;

    function showNextHeroPhrase() {
        if (!heroRunning) return;

        heroText.classList.remove("visible");
        heroText.classList.add("fade-out");

        setTimeout(() => {
            heroText.textContent = HERO_PHRASES[heroIndex].text;
            heroText.classList.remove("fade-out");
            heroText.classList.add("visible");
            heroIndex = (heroIndex + 1) % HERO_PHRASES.length;
        }, 600);

        setTimeout(showNextHeroPhrase, 3000);
    }

    // Start animation
    heroText.textContent = HERO_PHRASES[0].text;
    heroText.classList.add("visible");
    heroIndex = 1;
    setTimeout(showNextHeroPhrase, 3000);

    // --- Dropzone ---
    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("fileInput");
    const browseBtn = document.getElementById("browseBtn");
    const uploadSection = document.getElementById("uploadSection");
    const progressSection = document.getElementById("progressSection");
    const errorCard = document.getElementById("errorCard");
    const errorMsg = document.getElementById("errorMsg");

    browseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        fileInput.click();
    });

    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("drag-over");
    });

    dropzone.addEventListener("dragleave", () => {
        dropzone.classList.remove("drag-over");
    });

    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });

    fileInput.addEventListener("change", () => {
        if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
    });

    // --- Convert Another / Retry ---
    document.getElementById("convertAnother").addEventListener("click", resetUI);
    document.getElementById("errorRetry").addEventListener("click", resetUI);

    function resetUI() {
        progressSection.classList.add("hidden");
        errorCard.classList.add("hidden");
        uploadSection.classList.remove("hidden");
        fileInput.value = "";

        // Reset steps
        resetStep("stepUpload", "Uploading...");
        resetStep("stepDetect", "Detecting language...");
        resetStep("stepConvert", "Converting...");
        resetStep("stepDownload", "");
        document.getElementById("uploadProgress").style.width = "0%";
        document.getElementById("downloadBtn").classList.add("hidden");
        document.getElementById("deletedMsg").classList.add("hidden");
        document.getElementById("convertAnother").classList.add("hidden");
    }

    function resetStep(id, label) {
        const step = document.getElementById(id);
        step.classList.add("inactive");
        const spinner = step.querySelector(".spinner");
        const check = step.querySelector(".check-icon");
        const dot = step.querySelector(".step-dot");
        if (spinner) spinner.classList.add("hidden");
        if (check) check.classList.add("hidden");
        if (dot) dot.classList.remove("hidden");
        step.querySelector(".step-label").textContent = label;
        const sub = step.querySelector(".step-sublabel");
        if (sub) sub.remove();
    }

    function activateStep(id) {
        const step = document.getElementById(id);
        step.classList.remove("inactive");
        const spinner = step.querySelector(".spinner");
        const dot = step.querySelector(".step-dot");
        if (spinner) spinner.classList.remove("hidden");
        if (dot) dot.classList.add("hidden");
    }

    function completeStep(id, label) {
        const step = document.getElementById(id);
        step.classList.remove("inactive");
        const spinner = step.querySelector(".spinner");
        const check = step.querySelector(".check-icon");
        const dot = step.querySelector(".step-dot");
        if (spinner) spinner.classList.add("hidden");
        if (check) check.classList.remove("hidden");
        if (dot) dot.classList.add("hidden");
        if (label) step.querySelector(".step-label").textContent = label;
    }

    function addSublabel(id, text) {
        const step = document.getElementById(id);
        let sub = step.querySelector(".step-sublabel");
        if (!sub) {
            sub = document.createElement("p");
            sub.className = "step-sublabel";
            step.querySelector(".step-content").appendChild(sub);
        }
        sub.textContent = text;
    }

    function showError(message) {
        progressSection.classList.add("hidden");
        errorCard.classList.remove("hidden");
        errorMsg.textContent = message;
        trackEvent("conversion_error", { error_type: message.substring(0, 50) });
    }

    // --- File Handling ---
    async function handleFile(file) {
        // Validate
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            showError("Please select a PDF file.");
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            showError("File size exceeds 20MB limit.");
            return;
        }

        // Show progress
        uploadSection.classList.add("hidden");
        errorCard.classList.add("hidden");
        progressSection.classList.remove("hidden");

        const sizeCategory = file.size < 1024 * 1024 ? "small" : file.size < 10 * 1024 * 1024 ? "medium" : "large";
        trackEvent("upload_started", { file_size: sizeCategory });

        // Step 1: Upload
        activateStep("stepUpload");

        const formData = new FormData();
        formData.append("file", file);

        let uploadResult;
        try {
            uploadResult = await uploadFile(formData);
        } catch (err) {
            showError(err.message || "Upload failed. Please try again.");
            return;
        }

        completeStep("stepUpload", "Uploaded");

        // Step 2: Detection result
        activateStep("stepDetect");
        const detection = uploadResult.detection;

        if (detection.is_scanned) {
            completeStep("stepDetect", "Scanned document detected");
            showError("This appears to be a scanned document. IndicConvert currently supports text-based PDFs only.");
            trackEvent("conversion_error", { error_type: "scanned_pdf" });
            return;
        }

        if (detection.script) {
            const langStr = detection.languages.join(", ");
            completeStep("stepDetect", `${detection.sample} ${langStr} detected`);
            addSublabel("stepDetect", `Script: ${detection.script}${detection.is_mixed ? " (mixed document)" : ""}`);
            trackEvent("language_detected", { script: detection.script });
        } else {
            completeStep("stepDetect", "No Indian script detected");
            addSublabel("stepDetect", "Converting as-is");
        }

        // Step 3: Convert
        activateStep("stepConvert");
        const convertStart = Date.now();

        try {
            await convertFile(uploadResult.job_id);
        } catch (err) {
            showError(err.message || "Conversion failed. Please try again.");
            return;
        }

        const duration = Math.round((Date.now() - convertStart) / 1000);
        completeStep("stepConvert", `Converted in ${duration}s`);
        trackEvent("conversion_completed", { status: "success", duration_bucket: duration < 10 ? "fast" : duration < 30 ? "medium" : "slow" });

        // Step 4: Download ready
        const step = document.getElementById("stepDownload");
        step.classList.remove("inactive");
        const dot = step.querySelector(".step-dot");
        if (dot) dot.classList.add("hidden");
        const check = step.querySelector(".check-icon");
        check.classList.remove("hidden");

        const downloadBtn = document.getElementById("downloadBtn");
        downloadBtn.classList.remove("hidden");
        downloadBtn.href = `/api/download/${uploadResult.job_id}`;
        downloadBtn.addEventListener("click", function onDownload() {
            downloadBtn.removeEventListener("click", onDownload);
            const totalTime = Math.round((Date.now() - convertStart) / 1000);
            trackEvent("download_completed", { time_from_upload: totalTime });

            // Show deleted message after a short delay
            setTimeout(() => {
                document.getElementById("deletedMsg").classList.remove("hidden");
                document.getElementById("convertAnother").classList.remove("hidden");
            }, 1500);
        });
    }

    async function uploadFile(formData) {
        const progressFill = document.getElementById("uploadProgress");

        const xhr = new XMLHttpRequest();
        const promise = new Promise((resolve, reject) => {
            xhr.open("POST", "/api/upload");

            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    progressFill.style.width = pct + "%";
                }
            });

            xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    try {
                        const err = JSON.parse(xhr.responseText);
                        reject(new Error(err.detail || "Upload failed."));
                    } catch {
                        reject(new Error("Upload failed."));
                    }
                }
            });

            xhr.addEventListener("error", () => reject(new Error("Network error during upload.")));
            xhr.send(formData);
        });

        return promise;
    }

    async function convertFile(jobId) {
        const resp = await fetch(`/api/convert/${jobId}`, { method: "POST" });
        if (!resp.ok) {
            const data = await resp.json().catch(() => ({}));
            throw new Error(data.detail || "Conversion failed.");
        }
        return resp.json();
    }

    // --- Analytics (GA4 stub) ---
    function trackEvent(name, params) {
        if (typeof gtag === "function") {
            gtag("event", name, params || {});
        }
    }
})();
