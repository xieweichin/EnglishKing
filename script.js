// 請替換為您部署的 Apps Script Web 應用程式的 URL
const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyhl2hpyma3Il5anNS42-8kVgeVNtd_cLNrlyOUO9NrfJRVQB4VH5jee_2yEQv_UjdvBA/exec';

const COUNTDOWN_SECONDS = 15; // 每題倒數時間 (秒)

let vocabulary = [];
let currentCardIndex = 0;
let showingAnswer = false; // true 表示答案已顯示, false 表示題目在顯示
let countdownInterval;
let timeLeft = COUNTDOWN_SECONDS;

const questionElement = document.getElementById('question');
const answerElement = document.getElementById('answer');
const mainContainer = document.getElementById('main-container'); // 監聽閃卡區域的點擊
const countdownElement = document.getElementById('countdown');
const beepSound = document.getElementById('beepSound'); // 重新獲取 audio 元素

// 聲音播放函數：直接使用 <audio> 標籤播放
function playBeepSound() {
    if (beepSound) { // 確保 beepSound 元素存在
        beepSound.currentTime = 0; // 將播放位置重置為開頭
        // 嘗試播放，並捕獲可能的自動播放錯誤
        beepSound.play().catch(e => console.error("播放聲音失敗:", e)); 
    }
}

// 載入單字資料的異步函數
async function loadVocabulary() {
    try {
        questionElement.textContent = '載入單字中...'; // 顯示載入狀態
        answerElement.classList.add('hidden'); // 隱藏答案
        countdownElement.textContent = '--'; // 清空倒數顯示
        clearInterval(countdownInterval); // 清除任何正在運行的計時器

        // 向 Apps Script Web 應用程式發送請求獲取單字資料
        const response = await fetch(APPS_SCRIPT_WEB_APP_URL);
        if (!response.ok) {
            throw new Error(`HTTP 錯誤! 狀態碼: ${response.status}`); // 檢查 HTTP 請求是否成功
        }
        const data = await response.json(); // 解析 JSON 回應
        
        if (data.error) {
            throw new Error(`Apps Script 錯誤: ${data.error}`); // 檢查 Apps Script 是否回傳錯誤信息
        }

        if (data && data.length > 0) {
            vocabulary = data; // 將獲取的資料賦值給 vocabulary 陣列
            shuffleVocabulary(); // 初次載入時打亂單字順序
            displayCurrentCard(); // 顯示當前單字

            // **首次點擊頁面時，嘗試播放一次聲音以獲取瀏覽器許可**
            // 這是應對瀏覽器自動播放政策的關鍵。
            // 監聽器 { once: true } 確保只執行一次。
            mainContainer.addEventListener('click', () => {
                if (beepSound && beepSound.paused) { // 只有在音頻暫停狀態才嘗試播放
                    beepSound.play().catch(e => console.error("首次點擊音頻播放失敗:", e));
                }
            }, { once: true }); 

        } else {
            throw new Error('試算表中沒有找到單字資料，請檢查您的 Apps Script 設定。');
        }
    } catch (error) {
        console.error('載入單字或聲音時發生錯誤:', error);
        questionElement.textContent = `載入單字失敗：${error.message} 請檢查 Apps Script URL 和部署設定。`;
        answerElement.classList.add('hidden');
        clearInterval(countdownInterval);
        countdownElement.textContent = '--';
    }
}

// 打亂單字順序的函數
function shuffleVocabulary() {
    for (let i = vocabulary.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [vocabulary[i], vocabulary[j]] = [vocabulary[j], vocabulary[i]]; // 使用陣列解構賦值交換元素
    }
    currentCardIndex = 0; // 洗牌後從第一張牌開始
    displayCurrentCard(); // 顯示新順序的第一張牌
}

// 開始倒數計時的函數
function startCountdown() {
    clearInterval(countdownInterval); // 清除之前的任何計時器
    timeLeft = COUNTDOWN_SECONDS; // 重置倒數時間
    countdownElement.textContent = timeLeft; // 更新倒數顯示

    countdownInterval = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(countdownInterval); // 時間到，停止計時器
            playBeepSound(); // 播放聲音提醒
            // 這裡不自動顯示答案
        }
    }, 1000); // 每秒執行一次
}

// 顯示當前閃卡內容的函數
function displayCurrentCard() {
    if (vocabulary.length === 0) {
        questionElement.textContent = '沒有單字可供學習。';
        answerElement.classList.add('hidden');
        clearInterval(countdownInterval);
        countdownElement.textContent = '--';
        return;
    }

    const card = vocabulary[currentCardIndex]; // 獲取當前單字卡片
    questionElement.textContent = card.question; // 顯示題目
    answerElement.textContent = card.answer; // 設置答案內容
    answerElement.classList.add('hidden'); // 預設隱藏答案
    showingAnswer = false; // 重設為未顯示答案狀態
    startCountdown(); // 每題出現時開始倒數
}

// 處理閃卡區域點擊事件的函數
function handleCardClick(event) {
    // 檢查點擊是否來自隨機出題按鈕
    if (event.target === shuffleButton) {
        return; 
    }

    if (vocabulary.length === 0) return; // 如果沒有單字，不執行任何操作

    if (!showingAnswer) {
        // 如果當前是題目顯示狀態 (未顯示答案)，則點擊後顯示答案
        answerElement.classList.remove('hidden'); // 移除 hidden 類別，顯示答案
        showingAnswer = true; // 更新狀態為答案已顯示
        clearInterval(countdownInterval); // 答案顯示後停止倒數
    } else {
        // 如果當前是答案顯示狀態，則點擊後進入下一題
        currentCardIndex++; // 移動到下一個單字
        if (currentCardIndex >= vocabulary.length) {
            // 如果已經學完所有單字，循環回第一張並重新洗牌
            currentCardIndex = 0; 
            shuffleVocabulary(); 
            alert('您已經學習完所有單字！將重新開始。');
        }
        displayCurrentCard(); // 顯示下一張單字卡
    }
}

// 監聽閃卡區域的點擊事件，觸發顯示答案或下一題
mainContainer.addEventListener('click', handleCardClick);

// 監聽隨機出題按鈕的點擊事件
shuffleButton.addEventListener('click', (event) => {
    event.stopPropagation(); // 阻止事件冒泡到 mainContainer，只執行按鈕的邏輯
    if (vocabulary.length > 0) {
        shuffleVocabulary(); // 打亂單字順序
    }
});

// 頁面載入時自動執行載入單字的函數
loadVocabulary();