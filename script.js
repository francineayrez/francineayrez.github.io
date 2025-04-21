/**
 * Jogo da Forca interativo com vídeo e legendas
 * 
 * Este script implementa um jogo da forca onde as palavras são extraídas de legendas SRT
 * sincronizadas com um vídeo. O jogador digita letras para completar as palavras das legendas.
 */

// Variáveis globais
let word = ""; // Palavra atual que o jogador deve adivinhar
let guessed = []; // Array que rastreia quais letras foram adivinhadas corretamente
let errors = 0; // Contador de erros do jogador
let subtitles = []; // Array que armazena todas as legendas carregadas
let isPausedForGame = false; // Flag que indica se o vídeo está pausado para o jogo
let currentSubtitleIndex = -1; // Índice da legenda atual sendo exibida
let pauseTimeout; // Referência para o timeout que pausa o vídeo
let currentLetterIndex = 0; // Índice da próxima letra a ser adivinhada na palavra atual
let originalSubtitleData = []; // Armazena os dados originais das legendas

/**
 * Atualiza a exibição da palavra no jogo da forca
 * Mostra letras já adivinhadas e espaços entre palavras
 */
function updateWordDisplay() {
    const maxWordsPerLine = 4; // Número máximo de palavras por linha
    const characters = word.split('');
    let display = '';
    let wordCount = 0;

    for (let i = 0; i < characters.length; i++) {
        if (characters[i] === ' ') {
            // Trata espaços entre palavras
            display += '<span class="space">&nbsp;&nbsp;</span>';
            wordCount++;

            // Quebra de linha após um certo número de palavras
            if (wordCount % maxWordsPerLine === 0) {
                display += '<br>';
            }
        } else {
            // Mostra letra se foi adivinhada, senão mostra underline
            display += `<span class="${guessed[i] ? 'revealed' : ''}">${guessed[i] ? characters[i] : '_'}</span>`;
        }
    }

    document.getElementById("word").innerHTML = display;
}

/**
 * Processa uma tentativa de letra do jogador
 * @param {string} letter - Letra digitada pelo jogador
 */
function handleLetterGuess(letter) {
    // Pula espaços automaticamente
    while (currentLetterIndex < word.length && word[currentLetterIndex] === ' ') {
        guessed[currentLetterIndex] = true;
        currentLetterIndex++;
    }

    // Verifica se já completou todas as letras
    if (currentLetterIndex >= word.length) return;

    const expected = word[currentLetterIndex];

    if (letter === expected) {
        // Letra correta - marca como adivinhada e avança
        guessed[currentLetterIndex] = true;
        currentLetterIndex++;
        updateWordDisplay();
        checkWin();
    } else {
        // Letra incorreta - incrementa erros
        errors++;
        document.getElementById("errors").innerText = errors;

        // Verifica se atingiu o limite de erros
        if (errors >= 6) {
            endGame("Você perdeu! A palavra era: " + word);
        }
    }
}

/**
 * Verifica se o jogador completou todas as letras da palavra atual
 */
function checkWin() {
    // Pula espaços automaticamente
    while (currentLetterIndex < word.length && word[currentLetterIndex] === ' ') {
        guessed[currentLetterIndex] = true;
        currentLetterIndex++;
    }

    // Verifica se todas as letras foram adivinhadas
    if (guessed.every(g => g)) {
        // Avança para a próxima legenda
        currentSubtitleIndex++;

        if (currentSubtitleIndex < subtitles.length) {
            const nextSubtitle = subtitles[currentSubtitleIndex];
            setWordFromSubtitle(nextSubtitle);

            // Reproduz o vídeo no tempo da nova legenda
            const video = document.getElementById("video");
            video.currentTime = nextSubtitle.startTime;
            video.play();
        } else {
            // Todas as legendas foram completadas
            endGame("Você completou todas as frases!");
        }
    }
}

/**
 * Finaliza o jogo com uma mensagem
 * @param {string} message - Mensagem a ser exibida ao final do jogo
 */
function endGame(message) {
    alert(message);
    document.getElementById("restartButton").disabled = false;
    document.getElementById("video").pause();
}

/**
 * Reinicia o jogo
 */
function restartGame() {
    guessed = [];
    errors = 0;
    currentLetterIndex = 0;
    document.getElementById("errors").innerText = errors;
    updateWordDisplay();
    document.getElementById("errorMessage").innerText = "";
    document.getElementById("restartButton").disabled = true;
    isPausedForGame = false;

    // Reinicia o vídeo se houver legendas carregadas
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

// Configura o listener para o botão de reinício
document.getElementById("restartButton").addEventListener("click", restartGame);

/**
 * Navega entre legendas (anterior/próxima)
 * @param {number} direction - 1 para próxima, -1 para anterior
 */
function navigateSubtitles(direction) {
    // Verifica se há legendas carregadas
    if (subtitles.length === 0) return;

    // Calcula o novo índice
    let newIndex = currentSubtitleIndex + direction;

    // Limita aos índices válidos
    newIndex = Math.max(0, Math.min(newIndex, subtitles.length - 1));

    // Se o índice mudou, carrega a nova legenda
    if (newIndex !== currentSubtitleIndex) {
        currentSubtitleIndex = newIndex;
        const subtitle = subtitles[currentSubtitleIndex];

        // Atualiza a palavra e o vídeo
        setWordFromSubtitle(subtitle);

        const video = document.getElementById("video");
        video.currentTime = subtitle.startTime;

        // Se estava pausado para o jogo, continua pausado
        if (!isPausedForGame) {
            video.play();
        }
    }
}

/**
 * Une a legenda atual com a(s) próxima(s) mantendo a estrutura SRT
 */
function mergeWithNextSubtitle() {
    if (currentSubtitleIndex < 0 || currentSubtitleIndex >= subtitles.length - 1) {
        return;
    }

    const currentSub = subtitles[currentSubtitleIndex];
    const nextSub = subtitles[currentSubtitleIndex + 1];

    // Se já foi unida anteriormente, adiciona a próxima legenda ao grupo existente
    if (currentSub.isMerged) {
        currentSub.mergedSubtitles.push({
            text: nextSub.text,
            startTime: nextSub.startTime,
            endTime: nextSub.endTime
        });
        
        currentSub.text += " " + nextSub.text;
        currentSub.endTime = nextSub.endTime;
    } 
    // Se não foi unida, cria um novo grupo de legendas unidas
    else {
        currentSub.mergedSubtitles = [{
            text: currentSub.text,
            startTime: currentSub.startTime,
            endTime: currentSub.endTime
        }, {
            text: nextSub.text,
            startTime: nextSub.startTime,
            endTime: nextSub.endTime
        }];
        
        currentSub.text = currentSub.text + " " + nextSub.text;
        currentSub.endTime = nextSub.endTime;
        currentSub.isMerged = true;
    }

    // Remove a legenda que foi unida
    subtitles.splice(currentSubtitleIndex + 1, 1);
    updateAfterStructureChange();
}

/**
 * Separa a legenda atual que foi unida
 */
function splitCurrentSubtitle() {
    if (currentSubtitleIndex < 0 || currentSubtitleIndex >= subtitles.length) {
        return;
    }

    const currentSub = subtitles[currentSubtitleIndex];
    
    // Verifica se pode ser separada
    if (!currentSub.isMerged || !currentSub.mergedSubtitles || currentSub.mergedSubtitles.length < 2) {
        alert("Esta legenda não foi unida ou já está separada");
        return;
    }

    // Restaura todas as legendas originais
    const restoredSubtitles = currentSub.mergedSubtitles.map(sub => ({
        ...sub,
        isMerged: false,
        mergedSubtitles: null
    }));

    // Substitui a legenda unida pelas originais
    subtitles.splice(currentSubtitleIndex, 1, ...restoredSubtitles);
    
    // Ajusta o índice para a primeira legenda restaurada
    currentSubtitleIndex = Math.min(currentSubtitleIndex, subtitles.length - 1);
    
    updateAfterStructureChange();
}

/**
 * Atualiza a exibição após mudanças na estrutura das legendas
 */
function updateAfterStructureChange() {
    // Atualiza a exibição
    setWordFromSubtitle(subtitles[currentSubtitleIndex]);

    // Sincroniza o vídeo
    const video = document.getElementById("video");
    video.currentTime = subtitles[currentSubtitleIndex].startTime;

    if (!isPausedForGame) {
        video.play();
    }
}
/**
 * Repete o vídeo a partir do tempo atual da legenda
 */
function repeatCurrentVideoSegment() {
    const video = document.getElementById("video");
    const currentSubtitle = subtitles[currentSubtitleIndex];
    
    if (currentSubtitle) {
        isPausedForGame = false; // Garante que o vídeo vai tocar
        video.currentTime = currentSubtitle.startTime;
        video.play();
        
        // Feedback visual opcional
        showFeedback("Repetindo segmento atual...");
    }
}

// Função auxiliar para feedback visual
function showFeedback(message) {
    const feedback = document.getElementById("feedback");
    if (feedback) {
        feedback.textContent = message;
        feedback.classList.add("show");
        setTimeout(() => feedback.classList.remove("show"), 1000);
    }
}
/**
 * Encontra a melhor posição para dividir o texto
 */
function findBestSplitPosition(text) {
    // 1. Tenta dividir na posição atual do jogo
    if (currentLetterIndex > 0 && currentLetterIndex < text.length) {
        return findNearestSpace(text, currentLetterIndex);
    }

    // 2. Tenta dividir no meio da frase
    const middle = Math.floor(text.length / 2);
    return findNearestSpace(text, middle);
}

/**
 * Encontra o espaço mais próximo da posição dada
 */
function findNearestSpace(text, position) {
    // Primeiro tenta antes da posição
    for (let i = position; i > 0; i--) {
        if (text[i] === ' ') {
            return i;
        }
    }

    // Se não encontrou, tenta depois da posição
    for (let i = position; i < text.length; i++) {
        if (text[i] === ' ') {
            return i;
        }
    }

    // Se não encontrou espaços, divide no ponto original
    return position;
}

/**
 * Listener para teclas pressionadas
 */
document.addEventListener('keydown', function (event) {
    const key = event.key.toLowerCase();

     // Shift repete o segmento atual do vídeo
     if (event.key === 'Shift') {
        event.preventDefault(); // Isso previne qualquer ação padrão
        repeatCurrentVideoSegment();
        return; // Isso faz com que apenas a repetição ocorra
    }

    // Espaço pausa/reproduz o vídeo
    if (event.code === 'Space') {
        event.preventDefault();
        const video = document.getElementById("video");
        video.paused ? video.play() : video.pause();
        return;
    }

    // Espaço pausa/reproduz o vídeo
    if (event.code === 'Space') {
        event.preventDefault();
        const video = document.getElementById("video");
        video.paused ? video.play() : video.pause();
        return;
    }

    // Setas para navegar entre legendas
    if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateSubtitles(-1); // Volta para legenda anterior
        return;
    }

    if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateSubtitles(1); // Avança para próxima legenda
        return;
    }

    // Setas para unir/separar legendas
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        mergeWithNextSubtitle(); // Une com a próxima legenda
        return;
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        splitCurrentSubtitle(); // Separa a legenda atual
        return;
    }

    // Processa apenas letras de A-Z
    if (/^[a-z]$/.test(key)) {
        handleLetterGuess(key);
    }
});

/**
 * Listener para carregamento de vídeo
 */
document.getElementById("videoInput").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        const video = document.getElementById("video");
        video.src = url;
        video.load();

        // Se já houver legendas carregadas, reinicia o jogo
        if (subtitles.length > 0) {
            restartGame();
        }
    }
});

/**
 * Listener para carregamento de legendas SRT
 */
document.getElementById("fileInput").addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const result = parseSRT(e.target.result);
            subtitles = result.subtitles;
            originalSubtitleData = result.originalData;

            if (subtitles.length > 0) {
                currentSubtitleIndex = 0;
                setWordFromSubtitle(subtitles[currentSubtitleIndex]);

                // Inicia o vídeo se já estiver carregado
                const videoElement = document.getElementById("video");
                if (videoElement.src) {
                    videoElement.currentTime = subtitles[0].startTime;
                    videoElement.play();
                } else {
                    alert("Por favor, carregue o vídeo antes de iniciar.");
                }
            }
        };
        reader.readAsText(file);
    }
});

/**
 * Configura uma nova palavra a partir de uma legenda
 * @param {Object} subtitle - Objeto de legenda contendo texto e tempos
 */
function setWordFromSubtitle(subtitle) {
    // Processa o texto: remove pontuação, converte para minúsculas e mantém apenas letras e espaços
    word = subtitle.text.trim().toLowerCase().replace(/[^a-z\s]/g, '');
    guessed = new Array(word.length).fill(false);
    errors = 0;
    currentLetterIndex = 0;
    document.getElementById("errors").innerText = errors;
    updateWordDisplay();
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
 lucide.createIcons();

        function showNativeKeyboard() {
            const input = document.getElementById('nativeInput');
            input.focus();
            setTimeout(() => {
                input.setSelectionRange(input.value.length, input.value.length);
            }, 100);
        }

        // Exibe teclado nativo no primeiro toque
        document.addEventListener('touchstart', () => {
            showNativeKeyboard();
        }, { once: true });
