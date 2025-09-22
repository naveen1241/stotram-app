document.addEventListener('DOMContentLoaded', () => {
    const myAudio = document.getElementById('my-audio');
    const pdfViewer = document.getElementById('pdf-viewer');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressBarContainer = document.getElementById('progress-bar-container');
    const progressBar = document.getElementById('progress-bar');
    const timeDisplay = document.querySelector('.time-display');
    const speedSelect = document.getElementById('speed-select');
    const volumeSlider = document.getElementById('volume-slider');

    const audioTimestamps = [
        1, 93, 175, 258, 345, 414, 497, 585, 673,
    ];
    const pdfPageMap = [
        1, 2, 3, 4, 5, 6, 7, 8, 9,
    ];

    let lastTimestamp = 673;
    let lastPage = 9;
    const averageShlokaDuration = 84;
    for (let i = 9; i < 108; i++) {
        lastTimestamp += averageShlokaDuration;
        audioTimestamps.push(lastTimestamp);

        if (i % 2 === 0) {
            lastPage++;
        }
        if (lastPage <= 55) {
            pdfPageMap.push(lastPage);
        } else {
            pdfPageMap.push(55);
        }
    }

    let isPlaying = false;
    let duration = 0;
    let currentPage = 0;
    let pdfViewerReady = false;
    let scrollQueue = [];
    let isProcessingScroll = false;

    // Listen for messages from the parent window (the Weebly page).
    window.addEventListener('message', (event) => {
        if (event.origin === 'https://vishnusahasranaamam.weebly.com') {
            try {
                const message = JSON.parse(event.data);

                if (message.type === 'gotoPage' && message.pageNumber) {
                    if (pdfViewerReady) {
                        const viewerApp = pdfViewer.contentWindow.PDFViewerApplication;
                        if (viewerApp) {
                            viewerApp.page = message.pageNumber;
                        }
                    }
                }
            } catch (e) {
                if (event.data === 'start-audio') {
                    if (myAudio && !myAudio.paused) {
                    } else if (myAudio) {
                        myAudio.play().catch(error => {
                            console.error("Audio playback failed:", error);
                        });
                        const playPauseBtn = document.getElementById('play-pause-btn');
                        if (playPauseBtn) {
                            playPauseBtn.textContent = '⏸';
                        }
                    }
                } else {
                    console.error('Failed to parse message or unknown message:', e);
                }
            }
        }
    });

    pdfViewer.addEventListener('load', () => {
        const viewerWindow = pdfViewer.contentWindow;
        if (viewerWindow && viewerWindow.PDFViewerApplication) {
            viewerWindow.PDFViewerApplication.initializedPromise.then(() => {
                pdfViewerReady = true;
                processScrollQueue();
            });

            viewerWindow.document.addEventListener('pagerendered', (evt) => {
                // Ensure the event is for the current target page.
                if (evt.detail.pageNumber === currentPage) {
                    processScrollQueue();
                }
            });
        }
    });

    function processScrollQueue() {
        if (scrollQueue.length > 0 && !isProcessingScroll) {
            isProcessingScroll = true;
            const pageNumber = scrollQueue.shift();
            smoothHalfPageScroll(pageNumber);
            setTimeout(() => {
                isProcessingScroll = false;
            }, 500); // Allow time for the scroll to complete before processing the next item
        }
    }

    function createMarkers() {
        if (!myAudio.duration) {
            myAudio.addEventListener('loadedmetadata', createMarkers, { once: true });
            return;
        }
        const totalDuration = myAudio.duration;
        progressBarContainer.querySelectorAll('.marker').forEach(marker => marker.remove());
        audioTimestamps.forEach((timestamp, index) => {
            const marker = document.createElement('div');
            marker.className = 'marker';
            const markerPosition = (timestamp / totalDuration) * 100;
            marker.style.left = `${markerPosition}%`;
            const label = document.createElement('span');
            label.className = 'marker-label';
            label.textContent = `Shlokam ${index + 1}`;
            marker.appendChild(label);
            progressBarContainer.appendChild(marker);
        });
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function updateProgress() {
        if (!isNaN(duration)) {
            const progress = (myAudio.currentTime / duration) * 100;
            progressBar.style.width = `${progress}%`;
            timeDisplay.textContent = `${formatTime(myAudio.currentTime)} / ${formatTime(duration)}`;
        }
    }

    function togglePlayPause() {
        if (isPlaying) {
            myAudio.pause();
            playPauseBtn.textContent = '▶';
        } else {
            myAudio.play().catch(error => {
                console.error("Audio playback failed:", error);
                alert("Playback could not start. Please click the play button again.");
            });
            playPauseBtn.textContent = '⏸';
        }
        isPlaying = !isPlaying;
    }

    function syncPdfWithAudio() {
        const currentTime = myAudio.currentTime;
        let targetPage = 1;

        for (let i = audioTimestamps.length - 1; i >= 0; i--) {
            if (currentTime >= audioTimestamps[i]) {
                targetPage = pdfPageMap[i];
                break;
            }
        }
        if (targetPage !== currentPage && pdfViewerReady) {
            currentPage = targetPage;
            console.log('Syncing to page:', targetPage);
            scrollQueue.push(targetPage);
            const viewerApp = pdfViewer.contentWindow.PDFViewerApplication;
            if (viewerApp) {
                viewerApp.page = targetPage;
            }
        }
    }

    function smoothHalfPageScroll(pageNumber) {
        const viewerWindow = pdfViewer.contentWindow;
        if (!viewerWindow || !viewerWindow.PDFViewerApplication) return;
        
        const viewerApp = viewerWindow.PDFViewerApplication;
        const container = viewerApp.appConfig.mainContainer;
        const pageView = viewerApp.pageViews.get(pageNumber - 1);
        if (!pageView) {
            console.warn(`Page view for page ${pageNumber} not available yet. Re-queueing...`);
            scrollQueue.unshift(pageNumber); // Push to the front of the queue
            isProcessingScroll = false; // Release the lock
            return;
        }

        const pageHeight = pageView.div.clientHeight;
        const containerHeight = container.clientHeight;
        const targetScrollTop = pageView.div.offsetTop - (containerHeight / 2) + (pageHeight / 2);
        
        console.log(`Scrolling to page ${pageNumber} at target position:`, targetScrollTop);
        container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
        });
    }

    playPauseBtn.addEventListener('click', togglePlayPause);
    speedSelect.addEventListener('change', (event) => {
        myAudio.playbackRate = parseFloat(event.target.value);
    });
    volumeSlider.addEventListener('input', (event) => {
        myAudio.volume = event.target.value / 100;
    });
    progressBarContainer.addEventListener('click', (event) => {
        const containerRect = progressBarContainer.getBoundingClientRect();
        const clickX = event.clientX - containerRect.left;
        const seekPercentage = clickX / containerRect.width;
        if (!isNaN(duration)) {
            myAudio.currentTime = duration * seekPercentage;
        }
    });

    myAudio.addEventListener('loadedmetadata', () => {
        duration = myAudio.duration;
        updateProgress();
        createMarkers();
    });
    myAudio.addEventListener('timeupdate', () => {
        updateProgress();
        syncPdfWithAudio();
    });
    myAudio.addEventListener('ended', () => {
        playPauseBtn.textContent = '▶';
        isPlaying = false;
        currentPage = 0;
    });
    
    if (volumeSlider) {
        myAudio.volume = volumeSlider.value / 100;
    }
    
    if (myAudio.readyState >= 2) {
        duration = myAudio.duration;
        createMarkers();
    }
});
