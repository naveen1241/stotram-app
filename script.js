// PostMessage listener to start audio from the Weebly page
// This listener is useful if you have another page sending messages
// to this one, but for this use case it's not strictly needed here.
window.addEventListener('message', (event) => {
    // Validate the message origin for security
    if (event.origin === 'https://vishnusahasranaamam.weebly.com') {
        if (event.data === 'start-audio') {
            const myAudio = document.getElementById('my-audio');
            if (myAudio && !myAudio.paused) {
                // If the audio is playing, do nothing to avoid restarting.
            } else if (myAudio) {
                myAudio.play();
                const playPauseBtn = document.getElementById('play-pause-btn');
                if (playPauseBtn) {
                    playPauseBtn.textContent = '⏸';
                }
            }
        }
    }
});

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
        93, 175, 258, 345, 414, 497, 585, 673,
    ];
    const pdfPageMap = [
        1, 2, 3, 4, 5, 6, 7, 8,
    ];

    let lastTimestamp = 673;
    let lastPage = 8;
    const averageShlokaDuration = 84;
    for (let i = 8; i < 108; i++) {
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
            myAudio.play();
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
        if (targetPage !== currentPage) {
            currentPage = targetPage;
            if (pdfViewer.contentWindow) {
                const pdfMessage = { type: 'gotoPage', pageNumber: targetPage };
                
                // Use the explicit origin of your embedded GitHub page.
                const githubOrigin = 'https://naveen1241.github.io';
                pdfViewer.contentWindow.postMessage(JSON.stringify(pdfMessage), githubOrigin);
            }
        }
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
