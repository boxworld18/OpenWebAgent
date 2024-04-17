/* Function Bar */
const startIcon = document.querySelector('.start-icon');
const pauseIcon = document.querySelector('.pause-icon');
const stopIcon = document.querySelector('.stop-icon');
const resetIcon = document.querySelector('.reset-icon');
const taskBox = document.getElementById('task');
const statusBox = document.getElementById('status-box');
const answerBox = document.getElementById('answer-box');
const cotBox = document.getElementById('cot-box');
const model1Tab = document.getElementById('model1-tab');
const model2Tab = document.getElementById('model2-tab');

let selectedModel = 'model1';
let isRunning = false;
let isPaused = false;
let currentTask = '';

document.addEventListener('DOMContentLoaded', function () {
    chrome.action.onClicked.addListener((tab) => {
      chrome.action.setPanel({
        tabId: tab.id,
        panel: { width: 400, height: 600, url: "sidebar.html" }
      });
    });
})

model1Tab.addEventListener('click', () => {
    selectedModel = 'model1';
    chrome.storage.local.set({ ['selectedModel']: 'model1' });
    console.log('model1');
});

model2Tab.addEventListener('click', () => {
    selectedModel = 'model2';
    chrome.storage.local.set({ ['selectedModel']: 'model2' });
    console.log('model2');
});

startIcon.addEventListener('click', async () => {
    startIcon.style.display = 'none';
    pauseIcon.style.display = 'inline-block';

    // Reset answer and cot
    answerBox.innerHTML = '';
    cotBox.innerHTML = '';
    chrome.storage.local.set({ ['answer']: '' });
    chrome.storage.local.set({ ['cot']: '' });
    chrome.storage.local.set({ ['status']: 1 });

    var needRefresh = false;
    if (!isRunning) {
        stopIcon.style.color = '';
        stopIcon.classList.remove('disabled');
        stopIcon.classList.add('selected');
        isRunning = true;
        needRefresh = true;
    } else {
        chrome.runtime.sendMessage({ type: 'continueRecording' });
        isPaused = false;
    }

    await chrome.storage.local.set({['task']: currentTask});
    const result = await chrome.storage.local.get(['screenshotUrl']);
    await chrome.runtime.sendMessage({
        type: 'updateTask',
        data: {
            task: currentTask,
            screenchot: result.screenshotUrl,
            needRefresh: needRefresh,
            model_version: selectedModel,
        }
    });
});

pauseIcon.addEventListener('click', () => {
    pauseIcon.style.display = 'none';
    startIcon.style.display = 'inline-block';
    
    chrome.storage.local.set({ ['status']: 2 });
    isPaused = true;
});

stopIcon.addEventListener('click', () => {
    // Only stop if we're currently playing
    if (isRunning) {
        changeStatus(0);
        chrome.storage.local.set({ ['status']: 0 });
        stopIcon.style.display = 'inline-block';
        stopIcon.style.color = 'grey';
        stopIcon.classList.remove('selected');
        stopIcon.classList.add('disabled');
        if (!isPaused) {
            pauseIcon.style.display = 'none';
            startIcon.style.display = 'inline-block';
        }
        isRunning = false;
        isPaused = false;
    }
});

resetIcon.addEventListener('click', () => {
    startIcon.style.display = 'inline-block';
    pauseIcon.style.display = 'none';

    // Reset answer and cot and task
    answerBox.innerHTML = '';
    cotBox.innerHTML = '';
    chrome.storage.local.set({ ['answer']: '' });
    chrome.storage.local.set({ ['cot']: '' });
    chrome.storage.local.set({ ['status']: 0 });
    chrome.storage.local.set({ ['statusbox']: 0 });
    chrome.storage.local.set({ ['screenshotUrl']: '' });
    chrome.storage.local.set({ ['selectedModel']: 'model1' });

    isRunning = false;
    isPaused = false;
});

taskBox.addEventListener('change', () => {
    currentTask = taskBox.value;
});

function updateExternally(status) {
    if (status == 0) {
        startIcon.style.display = 'inline-block';
        pauseIcon.style.display = 'none';
        stopIcon.style.color = 'grey';
        isRunning = false;
        isPaused = false;
    } else {
        if (status < 0 || status > 2) return;

        if (stopIcon.classList.contains('disabled')) {
            stopIcon.classList.remove('disabled');
            stopIcon.classList.add('selected');
        }

        if (status == 1) {
            startIcon.style.display = 'none';
            pauseIcon.style.display = 'inline-block';
            stopIcon.style.color = '';
            isPaused = false;
        } else if (status == 2) {
            startIcon.style.display = 'inline-block';
            pauseIcon.style.display = 'none';
            stopIcon.style.color = '';
            isPaused = true;
        }
        isRunning = true;
    }
};

window.onload = async () => {
    let status = await chrome.storage.local.get(['status']);
    let task = await chrome.storage.local.get(['task']);
    let cot = await chrome.storage.local.get(['cot'])
    let answer = await chrome.storage.local.get(['answer']);
    let stb = await chrome.storage.local.get(['statusbox']);
    let model = await chrome.storage.local.get(['selectedModel']);
    taskBox.value = task.task;
    answerBox.innerHTML = answer.answer;
    cotBox.innerHTML = cot.cot;
    currentTask = task.task;
    changeStatus(stb.statusbox);
    updateExternally(status.status);
    if (model.selectedModel == 'model1') {
        model1Tab.classList.add('selected');
        model2Tab.classList.remove('selected');
    }
    else {
        model2Tab.classList.add('selected');
        model1Tab.classList.remove('selected');
    }
};

/* Extension related function */
chrome.tabs.captureVisibleTab(null, {format: 'png'}, (screenshotUrl) => {
    chrome.storage.local.set({screenshotUrl: screenshotUrl}, () => {});
});

function changeStatus(statusId) {
    switch (statusId) {
        case 0:
            statusBox.innerHTML = 'Web Agent';
            updateExternally(0);
            break;
        case 1:
            statusBox.innerHTML = 'Parsing...';
            break;
        case 2:
            statusBox.innerHTML = 'Generating...';
            break;
        case 3:
            statusBox.innerHTML = 'Acting...';
            break;
        case 4:
            statusBox.innerHTML = 'Finished!';
            updateExternally(0);
            break;
        case 5:
            statusBox.innerHTML = 'Paused!';
            updateExternally(2);
            break;
        default:
            statusBox.innerHTML = 'Wrong';
    }
}

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        console.log(message);
        switch (message.type) {
            case 'statusMessage':
                changeStatus(message.data);
                break;
            case 'cmdStatus':
                answerBox.innerHTML = message.data;
                break;
            case 'cotStatus':
                cotBox.innerHTML = message.data;
                break;
            default:
                break;
        }
    }
);