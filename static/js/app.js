/* IndicConvert — Frontend Logic */

(function () {
    "use strict";

    // --- Analytics Helpers ---
    function trackEvent(name, params) {
        if (typeof gtag === "function") {
            gtag("event", name, params || {});
        }
    }

    function setUserProperties(props) {
        if (typeof gtag === "function") {
            gtag("set", "user_properties", props);
        }
    }

    // --- Return Visit & User Properties ---
    let visitCount = parseInt(localStorage.getItem("ic_visit_count") || "0", 10) + 1;
    localStorage.setItem("ic_visit_count", visitCount);

    const now = new Date().toISOString();
    const lastVisit = localStorage.getItem("ic_last_visit");
    const firstVisit = localStorage.getItem("ic_first_visit") || now;
    localStorage.setItem("ic_first_visit", firstVisit);

    let lifetimeConversions = parseInt(localStorage.getItem("ic_lifetime_conversions") || "0", 10);
    let preferredScript = localStorage.getItem("ic_preferred_script") || "";
    const scriptCounts = JSON.parse(localStorage.getItem("ic_script_counts") || "{}");

    if (visitCount > 1 && lastVisit) {
        const daysSinceLast = Math.round((Date.now() - new Date(lastVisit).getTime()) / 86400000);
        trackEvent("return_visit", { visit_count: visitCount, days_since_last: daysSinceLast });
    }

    localStorage.setItem("ic_last_visit", now);

    setUserProperties({
        first_visit_date: firstVisit.slice(0, 10),
        total_lifetime_conversions: lifetimeConversions,
        preferred_script: preferredScript
    });

    // --- Session State ---
    let sessionConversions = 0;
    const sessionStart = Date.now();
    let lastError = null;

    window.addEventListener("beforeunload", function () {
        if (sessionConversions > 0) {
            trackEvent("session_conversions", {
                total_conversions: sessionConversions,
                session_duration_s: Math.round((Date.now() - sessionStart) / 1000)
            });
        }
    });

    // --- Scroll Depth Tracking ---
    const scrollThresholds = [25, 50, 75, 100];
    const scrollFired = {};

    function checkScrollDepth() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) return;
        const pct = Math.round((scrollTop / docHeight) * 100);
        for (const threshold of scrollThresholds) {
            if (pct >= threshold && !scrollFired[threshold]) {
                scrollFired[threshold] = true;
                trackEvent("scroll_depth", { depth: threshold });
            }
        }
    }

    window.addEventListener("scroll", checkScrollDepth, { passive: true });

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
            trackEvent("hero_cycle", { phrase_index: heroIndex, language: HERO_PHRASES[heroIndex].lang });
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

    // Dropzone hover tracking (debounced)
    let hoverFired = false;
    dropzone.addEventListener("mouseenter", () => {
        if (!hoverFired) {
            hoverFired = true;
            trackEvent("dropzone_hover");
        }
    });

    // Dropzone drag tracking (debounced)
    let dragFired = false;
    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("drag-over");
        if (!dragFired) {
            dragFired = true;
            trackEvent("dropzone_drag");
        }
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
    document.getElementById("convertAnother").addEventListener("click", function () {
        trackEvent("convert_another_clicked", { session_count: sessionConversions });
        resetUI();
    });
    document.getElementById("errorRetry").addEventListener("click", function () {
        if (lastError) {
            trackEvent("error_recovery", { previous_error: lastError });
        }
        resetUI();
    });

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

        // Reset debounce flags for dropzone tracking
        hoverFired = false;
        dragFired = false;
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
        lastError = message.substring(0, 50);
        trackEvent("conversion_error", { error_type: lastError });
    }

    // --- File Handling ---
    async function handleFile(file) {
        // Validate
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            trackEvent("file_rejected", { reason: "wrong_type" });
            showError("Please select a PDF file.");
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            trackEvent("file_rejected", { reason: "too_large" });
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

            // Update preferred script tracking
            scriptCounts[detection.script] = (scriptCounts[detection.script] || 0) + 1;
            localStorage.setItem("ic_script_counts", JSON.stringify(scriptCounts));
            // Find most-used script
            let maxCount = 0;
            for (const s in scriptCounts) {
                if (scriptCounts[s] > maxCount) {
                    maxCount = scriptCounts[s];
                    preferredScript = s;
                }
            }
            localStorage.setItem("ic_preferred_script", preferredScript);
            setUserProperties({ preferred_script: preferredScript });
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

        // Update conversion counters
        sessionConversions++;
        lifetimeConversions++;
        localStorage.setItem("ic_lifetime_conversions", lifetimeConversions);
        setUserProperties({ total_lifetime_conversions: lifetimeConversions });

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
})();
