/* IndicConvert — Frontend Logic */

(function () {
    "use strict";

    var i18n = window.IC_I18N;
    function t(key) { return i18n.t(key); }

    // ─── Analytics Helpers ───
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

    // ─── Return Visit & User Properties ───
    var visitCount = parseInt(localStorage.getItem("ic_visit_count") || "0", 10) + 1;
    localStorage.setItem("ic_visit_count", visitCount);

    var now = new Date().toISOString();
    var lastVisit = localStorage.getItem("ic_last_visit");
    var firstVisit = localStorage.getItem("ic_first_visit") || now;
    localStorage.setItem("ic_first_visit", firstVisit);

    var lifetimeConversions = parseInt(localStorage.getItem("ic_lifetime_conversions") || "0", 10);
    var preferredScript = localStorage.getItem("ic_preferred_script") || "";
    var scriptCounts = JSON.parse(localStorage.getItem("ic_script_counts") || "{}");

    if (visitCount > 1 && lastVisit) {
        var daysSinceLast = Math.round((Date.now() - new Date(lastVisit).getTime()) / 86400000);
        trackEvent("return_visit", { visit_count: visitCount, days_since_last: daysSinceLast });
    }

    localStorage.setItem("ic_last_visit", now);

    setUserProperties({
        first_visit_date: firstVisit.slice(0, 10),
        total_lifetime_conversions: lifetimeConversions,
        preferred_script: preferredScript
    });

    // ─── Session State ───
    var sessionConversions = 0;
    var sessionStart = Date.now();
    var lastError = null;

    window.addEventListener("beforeunload", function () {
        if (sessionConversions > 0) {
            trackEvent("session_conversions", {
                total_conversions: sessionConversions,
                session_duration_s: Math.round((Date.now() - sessionStart) / 1000)
            });
        }
    });

    // ─── Scroll Depth Tracking ───
    var scrollThresholds = [25, 50, 75, 100];
    var scrollFired = {};

    function checkScrollDepth() {
        var scrollTop = window.scrollY;
        var docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (docHeight <= 0) return;
        var pct = Math.round((scrollTop / docHeight) * 100);
        for (var i = 0; i < scrollThresholds.length; i++) {
            var threshold = scrollThresholds[i];
            if (pct >= threshold && !scrollFired[threshold]) {
                scrollFired[threshold] = true;
                trackEvent("scroll_depth", { depth: threshold });
            }
        }
    }

    window.addEventListener("scroll", checkScrollDepth, { passive: true });

    // ═══════════════════════════════════════
    // ─── ROTATING GREETING ANIMATION ───
    // ═══════════════════════════════════════
    var emojis = ['🙏', '👋', '🙏', '🙏', '🙏', '🙏', '🙏', '🙏', '🙏', '🙏'];
    var greetItems = document.querySelectorAll('.greet-item');
    var langItems = document.querySelectorAll('.lang-item');
    var emojiEl = document.getElementById('greetEmoji');
    var current = 0;
    var total = greetItems.length;

    function nextGreeting() {
        var prev = current;
        current = (current + 1) % total;

        // Exit old greeting
        greetItems[prev].classList.remove('active');
        greetItems[prev].classList.add('exit');
        langItems[prev].classList.remove('active');

        // After exit transition, enter new
        setTimeout(function () {
            greetItems[prev].classList.remove('exit');

            // Activate new greeting
            greetItems[current].classList.add('active');
            langItems[current].classList.add('active');

            // Pop the emoji
            emojiEl.style.transform = 'scale(0.7)';
            setTimeout(function () {
                emojiEl.textContent = emojis[current];
                emojiEl.style.transform = 'scale(1.15)';
                setTimeout(function () {
                    emojiEl.style.transform = 'scale(1)';
                }, 150);
            }, 120);
        }, 350);
    }

    setInterval(nextGreeting, 2500);

    // ═══════════════════════════════════════
    // ─── DROPZONE / FILE UPLOAD ───
    // ═══════════════════════════════════════
    var dropzone = document.getElementById("dropzone");
    var fileInput = document.getElementById("fileInput");
    var browseBtn = document.getElementById("browseBtn");
    var uploadSection = document.getElementById("uploadSection");
    var progressSection = document.getElementById("progressSection");
    var errorCard = document.getElementById("errorCard");
    var errorMsg = document.getElementById("errorMsg");

    browseBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        fileInput.click();
    });

    dropzone.addEventListener("click", function (e) {
        // Don't trigger if clicking the button itself (it has its own handler)
        if (e.target === browseBtn) return;
        fileInput.click();
    });

    // Dropzone hover tracking
    var hoverFired = false;
    dropzone.addEventListener("mouseenter", function () {
        if (!hoverFired) {
            hoverFired = true;
            trackEvent("dropzone_hover");
        }
    });

    // Drag & drop
    var dragFired = false;
    dropzone.addEventListener("dragover", function (e) {
        e.preventDefault();
        dropzone.classList.add("drag-over");
        if (!dragFired) {
            dragFired = true;
            trackEvent("dropzone_drag");
        }
    });

    dropzone.addEventListener("dragleave", function () {
        dropzone.classList.remove("drag-over");
    });

    dropzone.addEventListener("drop", function (e) {
        e.preventDefault();
        dropzone.classList.remove("drag-over");
        var files = e.dataTransfer.files;
        if (files.length > 0) handleFile(files[0]);
    });

    fileInput.addEventListener("change", function () {
        if (fileInput.files.length > 0) handleFile(fileInput.files[0]);
    });

    // ─── Convert Another / Retry ───
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

        resetStep("stepUpload", t("uploading"));
        resetStep("stepDetect", t("detecting"));
        resetStep("stepConvert", t("converting"));
        resetStep("stepDownload", "");
        document.getElementById("uploadProgress").style.width = "0%";
        document.getElementById("downloadBtn").classList.add("hidden");
        document.getElementById("deletedMsg").classList.add("hidden");
        document.getElementById("convertAnother").classList.add("hidden");

        hoverFired = false;
        dragFired = false;
    }

    function resetStep(id, label) {
        var step = document.getElementById(id);
        step.classList.add("inactive");
        var spinner = step.querySelector(".spinner");
        var check = step.querySelector(".check-icon");
        var dot = step.querySelector(".step-dot");
        if (spinner) spinner.classList.add("hidden");
        if (check) check.classList.add("hidden");
        if (dot) dot.classList.remove("hidden");
        step.querySelector(".step-label").textContent = label;
        var sub = step.querySelector(".step-sublabel");
        if (sub) sub.remove();
    }

    function activateStep(id) {
        var step = document.getElementById(id);
        step.classList.remove("inactive");
        var spinner = step.querySelector(".spinner");
        var dot = step.querySelector(".step-dot");
        if (spinner) spinner.classList.remove("hidden");
        if (dot) dot.classList.add("hidden");
    }

    function completeStep(id, label) {
        var step = document.getElementById(id);
        step.classList.remove("inactive");
        var spinner = step.querySelector(".spinner");
        var check = step.querySelector(".check-icon");
        var dot = step.querySelector(".step-dot");
        if (spinner) spinner.classList.add("hidden");
        if (check) check.classList.remove("hidden");
        if (dot) dot.classList.add("hidden");
        if (label) step.querySelector(".step-label").textContent = label;
    }

    function addSublabel(id, text) {
        var step = document.getElementById(id);
        var sub = step.querySelector(".step-sublabel");
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

    // ─── File Handling ───
    function handleFile(file) {
        // Validate
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            trackEvent("file_rejected", { reason: "wrong_type" });
            showError(t("err_not_pdf"));
            return;
        }
        if (file.size > 20 * 1024 * 1024) {
            trackEvent("file_rejected", { reason: "too_large" });
            showError(t("err_too_large"));
            return;
        }

        // Show progress
        uploadSection.classList.add("hidden");
        errorCard.classList.add("hidden");
        progressSection.classList.remove("hidden");

        var sizeCategory = file.size < 1024 * 1024 ? "small" : file.size < 10 * 1024 * 1024 ? "medium" : "large";
        trackEvent("upload_started", { file_size: sizeCategory });

        // Step 1: Upload
        activateStep("stepUpload");

        var formData = new FormData();
        formData.append("file", file);

        uploadFile(formData).then(function (uploadResult) {
            completeStep("stepUpload", t("uploaded"));

            // Step 2: Detection result
            activateStep("stepDetect");
            var detection = uploadResult.detection;

            if (detection.is_scanned) {
                completeStep("stepDetect", t("scanned_detected"));
                showError(t("err_scanned"));
                trackEvent("conversion_error", { error_type: "scanned_pdf" });
                return;
            }

            if (detection.script) {
                var langStr = detection.languages.join(", ");
                completeStep("stepDetect", detection.sample + " " + langStr + " " + t("detected_suffix"));
                addSublabel("stepDetect", t("script_prefix") + detection.script + (detection.is_mixed ? t("mixed_doc") : ""));
                trackEvent("language_detected", { script: detection.script });

                scriptCounts[detection.script] = (scriptCounts[detection.script] || 0) + 1;
                localStorage.setItem("ic_script_counts", JSON.stringify(scriptCounts));
                var maxCount = 0;
                for (var s in scriptCounts) {
                    if (scriptCounts[s] > maxCount) {
                        maxCount = scriptCounts[s];
                        preferredScript = s;
                    }
                }
                localStorage.setItem("ic_preferred_script", preferredScript);
                setUserProperties({ preferred_script: preferredScript });
            } else {
                completeStep("stepDetect", t("no_script"));
                addSublabel("stepDetect", t("as_is"));
            }

            // Step 3: Convert
            activateStep("stepConvert");
            var convertStart = Date.now();

            return convertFile(uploadResult.job_id).then(function () {
                var duration = Math.round((Date.now() - convertStart) / 1000);
                completeStep("stepConvert", t("converted_in_prefix") + duration + t("converted_in_suffix"));
                trackEvent("conversion_completed", { status: "success", duration_bucket: duration < 10 ? "fast" : duration < 30 ? "medium" : "slow" });

                sessionConversions++;
                lifetimeConversions++;
                localStorage.setItem("ic_lifetime_conversions", lifetimeConversions);
                setUserProperties({ total_lifetime_conversions: lifetimeConversions });

                // Step 4: Download ready
                var step = document.getElementById("stepDownload");
                step.classList.remove("inactive");
                var dot = step.querySelector(".step-dot");
                if (dot) dot.classList.add("hidden");
                var check = step.querySelector(".check-icon");
                check.classList.remove("hidden");

                var downloadBtn = document.getElementById("downloadBtn");
                downloadBtn.classList.remove("hidden");
                downloadBtn.href = "/api/download/" + uploadResult.job_id;
                downloadBtn.addEventListener("click", function onDownload() {
                    downloadBtn.removeEventListener("click", onDownload);
                    var totalTime = Math.round((Date.now() - convertStart) / 1000);
                    trackEvent("download_completed", { time_from_upload: totalTime });

                    setTimeout(function () {
                        document.getElementById("deletedMsg").classList.remove("hidden");
                        document.getElementById("convertAnother").classList.remove("hidden");
                    }, 1500);
                });
            });
        }).catch(function (err) {
            showError(err.message || t("err_generic"));
        });
    }

    function uploadFile(formData) {
        var progressFill = document.getElementById("uploadProgress");

        return new Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/upload");

            xhr.upload.addEventListener("progress", function (e) {
                if (e.lengthComputable) {
                    var pct = Math.round((e.loaded / e.total) * 100);
                    progressFill.style.width = pct + "%";
                }
            });

            xhr.addEventListener("load", function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    try {
                        var err = JSON.parse(xhr.responseText);
                        reject(new Error(err.detail || t("err_upload")));
                    } catch (e) {
                        reject(new Error(t("err_upload")));
                    }
                }
            });

            xhr.addEventListener("error", function () {
                reject(new Error(t("err_network")));
            });

            xhr.send(formData);
        });
    }

    function convertFile(jobId) {
        return fetch("/api/convert/" + jobId, { method: "POST" }).then(function (resp) {
            if (!resp.ok) {
                return resp.json().catch(function () { return {}; }).then(function (data) {
                    throw new Error(data.detail || t("err_convert"));
                });
            }
            return resp.json();
        });
    }

    // ─── Language Picker ───
    var langToggle = document.getElementById("langToggle");
    var langMenu = document.getElementById("langMenu");

    if (langToggle && langMenu) {
        langToggle.addEventListener("click", function (e) {
            e.stopPropagation();
            langMenu.classList.toggle("hidden");
        });

        langMenu.addEventListener("click", function (e) {
            var li = e.target.closest("[data-lang]");
            if (li) {
                var lang = li.getAttribute("data-lang");
                i18n.setLanguage(lang);
                langToggle.textContent = "🌐 " + i18n.LANG_NAMES[lang] + " ▾";
                langMenu.classList.add("hidden");
                trackEvent("language_changed", { language: lang });
            }
        });

        document.addEventListener("click", function () {
            langMenu.classList.add("hidden");
        });
    }

    // ─── Auto-detect and apply language ───
    var detectedLang = i18n.detectLanguage();
    i18n.setLanguage(detectedLang);
    langToggle.textContent = "🌐 " + i18n.LANG_NAMES[detectedLang] + " ▾";
})();
