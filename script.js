/**
 * Jogo da Forca interativo com vídeo e legendas
 * Otimizado para Android: menor carga no evento timeupdate
 */

// Variáveis globais
let word = "";
let guessed = [];
let errors = 0;
let subtitles = [];
let isPausedForGame = false;
let currentSubtitleIndex = -1;
let pauseTimeout;
let currentLetterIndex = 0;
let originalSubtitleData = [];
let lastUpdateTime = 0; // usado para debounce no timeupdate

document.getElementById("hiddenInput").focus();

function updateWordDisplay() {
    const maxWordsPerLine = 4;
    const characters = word.split('');
    let display = '';
    let wordCount = 0;

    for (let i = 0; i < characters.length; i++) {
        if (characters[i] === ' ') {
            display += '<span class="space">&nbsp;&nbsp;</span>';
            wordCount++;
            if (wordCount % maxWordsPerLine === 0) {
                display += '<br>';
            }
        } else {
            display += `<span class="${guessed[i] ? 'revealed' : ''}">${guessed[i] ? characters[i] : '_'}</span>`;
        }
    }

    document.getElementById("word").innerHTML = display;
}

function handleLetterGuess(letter) {
    while (currentLetterIndex < word.length && word[currentLetterIndex] === ' ') {
        guessed[currentLetterIndex] = true;
        currentLetterIndex++;
    }

    if (currentLetterIndex >= word.length) return;

    const expected = word[currentLetterIndex];

    if (letter === expected) {
        guessed[currentLetterIndex] = true;
        currentLetterIndex++;
        updateWordDisplay();
        checkWin();
    } else {
        errors++;
        document.getElementById("errors").innerText = errors;
        if (errors >= 6) {
            endGame("Você perdeu! A palavra era: " + word);
        }
    }
}

function checkWin() {
    while (currentLetterIndex < word.length && word[currentLetterIndex] === ' ') {
        guessed[currentLetterIndex] = true;
        currentLetterIndex++;
    }

    if (guessed.every(g => g)) {
        currentSubtitleIndex++;
        if (currentSubtitleIndex < subtitles.length) {
            const nextSubtitle = subtitles[currentSubtitleIndex];
            setWordFromSubtitle(nextSubtitle);
            const video = document.getElementById("video");
            video.currentTime = nextSubtitle.startTime;
            video.play();
        } else {
            endGame("Você completou todas as frases!");
        }
    }
}

function endGame(message) {
    alert(message);
    document.getElementById("restartButton").disabled = false;
    document.getElementById("video").pause();
}

function restartGame() {
    guessed = [];
    errors = 0;
    currentLetterIndex = 0;
    document.getElementById("errors").innerText = errors;
    updateWordDisplay();
    document.getElementById("errorMessage").innerText = "";
    document.getElementById("restartButton").disabled = true;
    isPausedForGame = false;

    if (subtitles.length > 0) {
        currentSubtitleIndex = 0;
        setWordFromSubtitle(subtitles[currentSubtitleIndex]);
        const video = document.getElementById("video");
        video.currentTime = subtitles[0].startTime;
        video.play();
    } else {
        document.getElementById("video").play();
    }
}

document.getElementById("restartButton").addEventListener("click", restartGame);

document.getElementById("video").addEventListener("timeupdate", function () {
    const now = Date.now();
    if (now - lastUpdateTime < 300) return;
    lastUpdateTime = now;

    const currentTime = this.currentTime;
    let currentSubtitle = null;

    while (currentSubtitleIndex < subtitles.length && subtitles[currentSubtitleIndex].endTime < currentTime) {
        currentSubtitleIndex++;
        isPausedForGame = false;
    }

    if (currentSubtitleIndex < subtitles.length &&
        subtitles[currentSubtitleIndex].startTime <= currentTime &&
        subtitles[currentSubtitleIndex].endTime >= currentTime) {
        currentSubtitle = subtitles[currentSubtitleIndex];
    }

    if (currentSubtitle) {
        document.getElementById("subtitle").innerText = currentSubtitle.text;
        const cleanText = currentSubtitle.text.trim().toLowerCase().replace(/[^a-z\s]/g, '');
        if (cleanText !== word) {
            setWordFromSubtitle(currentSubtitle);
        }
    } else {
        document.getElementById("subtitle").innerText = "";
    }

    if (currentSubtitle && !isPausedForGame) {
        clearTimeout(pauseTimeout);
        pauseTimeout = setTimeout(() => {
            this.pause();
            isPausedForGame = true;
        }, (currentSubtitle.endTime - currentTime) * 1000);
    }
});

function setWordFromSubtitle(subtitle) {
    word = subtitle.text.trim().toLowerCase().replace(/[^a-z\s]/g, '');
    guessed = new Array(word.length).fill(false);
    errors = 0;
    currentLetterIndex = 0;
    document.getElementById("errors").innerText = errors;
    updateWordDisplay();

    const hiddenInput = document.getElementById("hiddenInput");
    hiddenInput.value = '';
    hiddenInput.focus();
}




/**
 * Listener para atualização de tempo do vídeo
 * Sincroniza as legendas com o tempo atual do vídeo
 */
document.getElementById("video").addEventListener("timeupdate", function () {
    const currentTime = this.currentTime;
    let currentSubtitle = null;

    // Avança para a legenda atual baseada no tempo
    while (currentSubtitleIndex < subtitles.length &&
        subtitles[currentSubtitleIndex].endTime < currentTime) {
        currentSubtitleIndex++;
        isPausedForGame = false;
    }

    // Verifica se encontrou uma legenda para o tempo atual
    if (currentSubtitleIndex < subtitles.length &&
        subtitles[currentSubtitleIndex].startTime <= currentTime &&
        subtitles[currentSubtitleIndex].endTime >= currentTime) {
        currentSubtitle = subtitles[currentSubtitleIndex];
    }

    // Atualiza a exibição da legenda
    if (currentSubtitle) {
        document.getElementById("subtitle").innerText = currentSubtitle.text;
        setWordFromSubtitle(currentSubtitle);
    } else {
        document.getElementById("subtitle").innerText = "";
    }

    // Configura o timeout para pausar o vídeo no final da legenda
    if (currentSubtitle && !isPausedForGame) {
        clearTimeout(pauseTimeout);
        pauseTimeout = setTimeout(() => {
            this.pause();
            isPausedForGame = true;
        }, (currentSubtitle.endTime - currentTime) * 1000);
    }
});

/**
 * Analisa um arquivo SRT e extrai as legendas
 * @param {string} srtText - Conteúdo do arquivo SRT
 * @returns {Object} Objeto com {subtitles, originalData}
 */
function parseSRT(srtText) {
    let entries = srtText.split(/\n\n|\r\n\r\n/);
    let parsedSubtitles = [];
    let originalData = [];

    entries.forEach(entry => {
        let lines = entry.split(/\r?\n/);
        if (lines.length >= 3 && lines[1].includes(" --> ")) {
            let index = parseInt(lines[0]);
            let time = lines[1].split(' --> ');
            let startTime = timeToSeconds(time[0]);
            let endTime = timeToSeconds(time[1]);

            // Limpa o texto da legenda
            let subtitleText = lines.slice(2)
                .join(" ")
                .replace(/\[.*?\]/g, '')
                .replace(/♪/g, '')
                .trim();

            if (subtitleText) {
                parsedSubtitles.push({
                    index,
                    startTime,
                    endTime,
                    text: subtitleText,
                    originalTimeString: lines[1],
                    isMerged: false,
                    mergedSubtitles: null
                });

                originalData.push({
                    index,
                    originalStartTime: startTime,
                    originalEndTime: endTime,
                    originalText: subtitleText,
                    originalTimeString: lines[1],
                    merged: false,
                    split: false
                });
            }
        }
    });

    return {
        subtitles: parsedSubtitles,
        originalData: originalData
    };
}

/**
 * Converte um tempo no formato HH:MM:SS,ms para segundos
 * @param {string} timeStr - String de tempo no formato SRT
 * @returns {number} Tempo em segundos
 */
function timeToSeconds(timeStr) {
    let [h, m, s] = timeStr.split(':');
    let [sec, ms] = s.split(',');
    return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(sec) + parseInt(ms) / 1000;
}

/**
 * Gera botões de letras para interface alternativa (não implementado)
 */
function generateLetterButtons() {
    // Implementação futura para criar botões de A-Z
    console.log("Função generateLetterButtons() ainda não implementada");
}
