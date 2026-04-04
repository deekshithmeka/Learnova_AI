(function () {
    "use strict";

    const form = document.getElementById("yt-mindmap-form");
    const urlInput = document.getElementById("youtube-url");
    const alertBox = document.getElementById("yt-alert");
    const generateBtn = document.getElementById("generate-mindmap-btn");

    const metaVideoTitle = document.getElementById("meta-video-title");
    const metaCharCount = document.getElementById("meta-char-count");

    const previewWrap = document.getElementById("yt-preview-wrap");
    const codeWrap = document.getElementById("yt-code-wrap");
    const emptyState = document.getElementById("yt-empty-state");

    const diagramWrap = document.getElementById("mermaid-diagram");
    const downloadSvgBtn = document.getElementById("download-svg-btn");
    const openEditorLink = document.getElementById("open-editor-link");
    const codeBlock = document.getElementById("mermaid-code");
    const copyBtn = document.getElementById("copy-mermaid-btn");

    let currentMermaidCode = "";
    let currentVideoTitle = "";

    function showAlert(message, type) {
        if (!alertBox) return;
        alertBox.textContent = message;
        alertBox.className = "form-alert " + type;
        alertBox.hidden = false;
        setTimeout(() => {
            alertBox.hidden = true;
        }, 5000);
    }

    function setLoading(loading) {
        if (!generateBtn) return;
        const btnText = generateBtn.querySelector(".btn-text");
        const btnLoader = generateBtn.querySelector(".btn-loader");

        // Ensure proper state reset
        if (loading) {
            generateBtn.disabled = true;
            if (btnText) btnText.textContent = "Generating...";
            if (btnLoader) {
                btnLoader.hidden = false;
                btnLoader.style.display = 'inline-block';
            }
        } else {
            generateBtn.disabled = false;
            if (btnText) btnText.textContent = "Generate Mindmap";
            if (btnLoader) {
                btnLoader.hidden = true;
                btnLoader.style.display = 'none';
            }
        }
    }

    function renderMermaidImage(imageUrl) {
        try {
            if (!diagramWrap) return;

            // Clear previous content
            diagramWrap.innerHTML = '';
            
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = "Generated Mermaid mindmap";
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.borderRadius = '8px';
            
            img.onerror = () => {
                diagramWrap.innerHTML = '<p style="color: #ff8b8b; padding: 20px; text-align: center;">Failed to load mindmap image. Please check the Mermaid code below.</p>';
            };
            
            diagramWrap.appendChild(img);
        } catch (error) {
            console.error('Failed to render mermaid diagram:', error);
            if (diagramWrap) {
                diagramWrap.innerHTML = '<p style="color: #ff8b8b; padding: 20px; text-align: center;">Failed to render diagram.</p>';
            }
        }
    }

    async function downloadSvg() {
        try {
            if (!currentMermaidCode) {
                showAlert("No diagram to download.", "error");
                return;
            }

            const encoded = base64url(currentMermaidCode);
            const svgUrl = `https://mermaid.ink/svg/${encoded}`;
            const response = await fetch(svgUrl);
            const svgText = await response.text();
            
            const blob = new Blob([svgText], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = (currentVideoTitle || 'mindmap').replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.svg';
            link.click();
            URL.revokeObjectURL(url);
            showAlert("SVG downloaded successfully.", "success");
        } catch (error) {
            console.error('Download failed:', error);
            showAlert("Failed to download SVG.", "error");
        }
    }

    function base64url(str) {
        return btoa(str)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    function renderResult(data) {
        currentMermaidCode = data.mermaidCode || "";
        currentVideoTitle = data.videoTitle || "YouTube Video";

        if (metaVideoTitle) metaVideoTitle.textContent = currentVideoTitle;
        if (metaCharCount) metaCharCount.textContent = String(data.charCount || 0);

        if (codeBlock) codeBlock.textContent = currentMermaidCode;
        if (openEditorLink) openEditorLink.href = data.editorUrl;

        // Use imageUrl from backend (already properly encoded)
        if (data.imageUrl) {
            renderMermaidImage(data.imageUrl);
        }

        if (previewWrap) previewWrap.hidden = false;
        if (codeWrap) codeWrap.hidden = false;
        if (emptyState) emptyState.hidden = true;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const youtubeUrl = (urlInput.value || "").trim();
        if (!youtubeUrl) {
            showAlert("Please enter a YouTube URL.", "error");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/youtube-mindmap/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ youtube_url: youtubeUrl }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to generate mindmap.");
            }

            renderResult(data);
            showAlert("Mindmap generated successfully.", "success");
        } catch (error) {
            showAlert(error.message || "Failed to generate mindmap.", "error");
        } finally {
            // Ensure loading state is reset
            setLoading(false);
            // Force a double-check after a brief delay
            setTimeout(() => {
                setLoading(false);
            }, 100);
        }
    }

    async function copyCode() {
        const text = codeBlock ? codeBlock.textContent : "";
        if (!text) {
            showAlert("No Mermaid code to copy yet.", "error");
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
            showAlert("Mermaid code copied.", "success");
        } catch (error) {
            showAlert("Copy failed. Please copy manually.", "error");
        }
    }

    if (form) {
        form.addEventListener("submit", handleSubmit);
    }

    if (copyBtn) {
        copyBtn.addEventListener("click", copyCode);
    }

    if (downloadSvgBtn) {
        downloadSvgBtn.addEventListener("click", downloadSvg);
    }
})();
