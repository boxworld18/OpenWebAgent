/* Function Bar */
const startIcon = document.querySelector('.start-icon');
const pauseIcon = document.querySelector('.pause-icon');
const stopIcon = document.querySelector('.stop-icon');
const resetIcon = document.querySelector('.reset-icon');
const taskBox = document.getElementById('task');
const statusBox = document.getElementById('status-box');
const answerBox = document.getElementById('answer-box');
const cotBox = document.getElementById('cot-box');
// const model1Tab = document.getElementById('model1-tab');
// const model2Tab = document.getElementById('model2-tab');
// const model3Tab = document.getElementById('model3-tab');
const inputBox = document.getElementById('task');
const container = document.getElementById("d-container");

let selectedModel = 'model1';
let isRunning = false;
let isPaused = false;
let currentTask = '';
// let cots = ["Action: Type EA \"Attention is all you need\"\nSegment: input[EA]", "Action: Click FA\nSegment: a[FA]|Search","Action: Click MD\nSegment: a[MD]|cite","Answer:Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., ... & Polosukhin, I. (2017). Attention is all you need. Advances in neural information processing systems, 30."]
let cots = [];

// 为数组中的每个元素创建一个对话框
function updateCot() {
    container.innerHTML = "";
    if (cots.length == 0) {
        if (!isRunning || isPaused) {
            console.log("No Actions Yet.");
            container.innerHTML = "No Actions Yet.";
        }
    }
    else {
        cots.forEach((elem, index) => {
            const dialogueContainer = document.createElement("div");
            dialogueContainer.className = "dialogue-container";

            // 创建对话框元素
            const dialogueDiv = document.createElement("div");
            dialogueDiv.className = "dialogue";
        
            // 创建头像
            const avatarDiv = document.createElement("div");
            avatarDiv.className = "avatar";
        
            // 创建文本段落(按\n分割, 每个段落一个p)
            const ps = elem.split("\n");
            const textPlist = []
            ps.forEach((p) => {
                const pElem = document.createElement("p");
                pElem.textContent = p;
                textPlist.push(pElem);
            });

            const stepP = document.createElement("p");
            stepP.textContent = "STEP " + (index + 1); // 数组索引从0开始，所以加1
        
            // 将头像和文本添加到对话框
            dialogueDiv.appendChild(avatarDiv);
            dialogueDiv.appendChild(stepP);
            textPlist.forEach((p) => {
                dialogueDiv.appendChild(p);
            });
            
            dialogueContainer.appendChild(dialogueDiv);

            // 将对话框添加到容器中
            console.log(dialogueDiv);
            container.appendChild(dialogueContainer);
        });
    }

    if (isRunning && !isPaused) {
        const dialogueContainer = document.createElement("div");
        dialogueContainer.className = "dialogue-container";

        // 创建对话框元素
        const dialogueDiv = document.createElement("div");
        dialogueDiv.className = "dialogue-loading";
    
        // 创建头像
        const avatarDiv = document.createElement("div");
        avatarDiv.className = "avatar";

        // 创建加载动画
        const loadingDiv = document.createElement("div");
        loadingDiv.className = "loading";

        // 将头像和文本添加到对话框
        dialogueDiv.appendChild(avatarDiv);
        dialogueDiv.appendChild(loadingDiv);

        dialogueContainer.appendChild(dialogueDiv);

        // 将对话框添加到容器中
        console.log(dialogueDiv);
        container.appendChild(dialogueContainer);
    }

    const lastDiv = document.createElement("div");
    lastDiv.id = "last_element"
    container.appendChild(lastDiv);
    updateView();
}

// const port = chrome.runtime.connect({ name: "content-script" });

// model1Tab.addEventListener('click', () => {
//     if(!isRunning) {
//         selectedModel = 'model1';
//         chrome.storage.local.set({ ['selectedModel']: 'model1' });
//         console.log('model1');
//     }
//     else
//     {
//         if (selectedModel == 'model1') {
//             model1Tab.attributes['aria-selected'] = true;
//             model2Tab.attributes['aria-selected'] = false;
//             model3Tab.attributes['aria-selected'] = false;
//         }
//         else if (selectedModel == 'model2') {
//             model2Tab.attributes['aria-selected'] = true;
//             model1Tab.attributes['aria-selected'] = false;
//             model3Tab.attributes['aria-selected'] = false;
//         }
//         else if (selectedModel == 'model3') {
//             model3Tab.attributes['aria-selected'] = true;
//             model1Tab.attributes['aria-selected'] = false;
//             model2Tab.attributes['aria-selected'] = false;
//         }
//     }
// });

// model2Tab.addEventListener('click', () => {
//     updateCot();
//     if(!isRunning) {
//         selectedModel = 'model2';
//         chrome.storage.local.set({ ['selectedModel']: 'model2' });
//         console.log('model2');
//     }
//     else
//     {
//         if (selectedModel == 'model1') {
//             model1Tab.attributes['aria-selected'] = true;
//             model2Tab.attributes['aria-selected'] = false;
//             model3Tab.attributes['aria-selected'] = false;
//         }
//         else if (selectedModel == 'model2') {
//             model2Tab.attributes['aria-selected'] = true;
//             model1Tab.attributes['aria-selected'] = false;
//             model3Tab.attributes['aria-selected'] = false;
//         }
//         else if (selectedModel == 'model3') {
//             model3Tab.attributes['aria-selected'] = true;
//             model1Tab.attributes['aria-selected'] = false;
//             model2Tab.attributes['aria-selected'] = false;
//         }
//     }
// });

// model3Tab.addEventListener('click', () => {
//     if(!isRunning) {
//         selectedModel = 'model3';
//         chrome.storage.local.set({ ['selectedModel']: 'model3' });
//         console.log('model3');
//     }
//     else
//     {
//         if (selectedModel == 'model1') {
//             model1Tab.attributes['aria-selected'] = true;
//             model2Tab.attributes['aria-selected'] = false;
//             model3Tab.attributes['aria-selected'] = false;
//         }
//         else if (selectedModel == 'model2') {
//             model2Tab.attributes['aria-selected'] = true;
//             model1Tab.attributes['aria-selected'] = false;
//             model3Tab.attributes['aria-selected'] = false;
//         }
//         else if (selectedModel == 'model3') {
//             model3Tab.attributes['aria-selected'] = true;
//             model1Tab.attributes['aria-selected'] = false;
//             model2Tab.attributes['aria-selected'] = false;
//         }
//     }
// });

inputBox.addEventListener('keyup', (event) => {
    if (inputBox.value == '') {
        startIcon.classList.add('disabled');
    }
    else {
        startIcon.classList.remove('disabled');
    }
});

startIcon.addEventListener('click', async () => {
    if (inputBox.value == '') {
        console.log('empty');
        return;
    }
    console.log('start');
    startIcon.style.display = 'none';
    pauseIcon.style.display = 'inline-block';

    // Reset answer and cot
    // answerBox.innerHTML = '';
    // cotBox.innerHTML = '';
    chrome.storage.local.set({ ['answer']: '' });
    chrome.storage.local.set({ ['cot']: '' });
    chrome.storage.local.set({ ['status']: 1 });

    var needRefresh = false;
    if (!isRunning) {
        stopIcon.style.color = '';
        stopIcon.classList.remove('disabled');
        stopIcon.classList.add('selected');
        needRefresh = true;
        // model1Tab.classList.add('non-clickable');
        // model2Tab.classList.add('non-clickable');
        // model3Tab.classList.add('non-clickable');
        updateExternally(0);
        isRunning = true;
    } else {
        chrome.runtime.sendMessage({ type: 'continueRecording' });
        // model1Tab.classList.add('non-clickable');
        // model2Tab.classList.add('non-clickable');
        // model3Tab.classList.add('non-clickable');
        isPaused = false;
        isRunning = true;
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

    updateCot();
    // Send a message to the background script
    // port.postMessage({
    //     type: 'updateTask',
    //     data: {
    //         task: currentTask,
    //         screenchot: result.screenshotUrl,
    //         needRefresh: needRefresh,
    //         model_version: selectedModel,
    //     }
    // });
});

pauseIcon.addEventListener('click', () => {
    console.log('pause');
    pauseIcon.style.display = 'none';
    startIcon.style.display = 'inline-block';
    
    chrome.storage.local.set({ ['status']: 2 });
    isPaused = true;
    updateCot();
});

resetIcon.addEventListener('click', () => {
    console.log('reset');
    startIcon.style.display = 'inline-block';
    pauseIcon.style.display = 'none';

    // Reset answer and cot and task
    taskBox.value = '';
    // answerBox.innerHTML = '';
    // cotBox.innerHTML = '';
    cots = [];
    updateCot();
    // model1Tab.classList.remove('non-clickable');
    // model2Tab.classList.remove('non-clickable');
    // model3Tab.classList.remove('non-clickable');
    chrome.storage.local.set({ ['answer']: '' });
    chrome.storage.local.set({ ['cot']: '' });
    chrome.storage.local.set({ ['status']: 0 });
    chrome.storage.local.set({ ['statusbox']: 0 });
    chrome.storage.local.set({ ['task']: '' });
    chrome.storage.local.set({ ['screenshotUrl']: '' });
    chrome.storage.local.set({ ['selectedModel']: 'model1' });

    isRunning = false;
    isPaused = false;

    changeStatus(0);
    updateExternally(0);
    updateCot();

    // if (selectedModel == 'model1') {
    //     model1Tab.attributes['aria-selected'] = true;
    //     model2Tab.attributes['aria-selected'] = false;
    //     model3Tab.attributes['aria-selected'] = false;
    // }
    // else if (selectedModel == 'model2') {
    //     model2Tab.attributes['aria-selected'] = true;
    //     model1Tab.attributes['aria-selected'] = false;
    //     model3Tab.attributes['aria-selected'] = false;
    // }
    // else if (selectedModel == 'model3') {
    //     model3Tab.attributes['aria-selected'] = true;
    //     model1Tab.attributes['aria-selected'] = false;
    //     model2Tab.attributes['aria-selected'] = false;
    // }
});

stopIcon.addEventListener('click', () => {
    console.log('stop');
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
    updateCot();
});

taskBox.addEventListener('change', () => {
    currentTask = taskBox.value;
});

function updateExternally(status) {
    console.log('updateExternally');
    if (status == 0) {
        // startIcon.style.display = 'inline-block';
        // pauseIcon.style.display = 'none';
        stopIcon.style.color = 'grey';
        // isRunning = false;
        // isPaused = true;
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
    console.log('onload');
    cots = [];
    updateCot();
    let status = await chrome.storage.local.get(['status']);
    let task = await chrome.storage.local.get(['task']);
    let cot = await chrome.storage.local.get(['cot'])
    let answer = await chrome.storage.local.get(['answer']);
    let stb = await chrome.storage.local.get(['statusbox']);
    let model = await chrome.storage.local.get(['selectedModel']);
    taskBox.value = task.task;
    // answerBox.innerHTML = answer.answer;
    // cotBox.innerHTML = cot.cot;
    currentTask = task.task;
    changeStatus(stb.statusbox);
    updateExternally(status.status);
    // if (model == 'model1') {
    //     model1Tab.attributes['aria-selected'] = true;
    //     model2Tab.attributes['aria-selected'] = false;
    //     model3Tab.attributes['aria-selected'] = false;
    // }
    // else if (model == 'model2') {
    //     model2Tab.attributes['aria-selected'] = true;
    //     model1Tab.attributes['aria-selected'] = false;
    //     model3Tab.attributes['aria-selected'] = false;
    // }
    // else if (model == 'model3') {
    //     model3Tab.attributes['aria-selected'] = true;
    //     model1Tab.attributes['aria-selected'] = false;
    //     model2Tab.attributes['aria-selected'] = false;
    // }
};

/* Extension related function */
chrome.tabs.captureVisibleTab(null, {format: 'png'}, (screenshotUrl) => {
    chrome.storage.local.set({screenshotUrl: screenshotUrl}, () => {});
});

function changeStatus(statusId) {
    switch (statusId) {
        case 0:
            // statusBox.innerHTML = 'AutoGLM';
            updateExternally(0);
            break;
        case 1:
            // statusBox.innerHTML = 'Parsing...';
            break;
        case 2:
            // statusBox.innerHTML = 'Generating...';
            break;
        case 3:
            // statusBox.innerHTML = 'Acting...';
            break;
        case 4:
            // statusBox.innerHTML = 'Finished!';
            isRunning = false;
            updateExternally(0);
            break;
        case 5:
            // statusBox.innerHTML = 'Paused!';
            updateExternally(2);
            break;
        default:
            // statusBox.innerHTML = 'Wrong';
    }
}

function updateView() {
    document.getElementById("last_element").scrollIntoView({
    // document.body.scrollIntoView({
        behavior: "auto",
        block: "center"
    });
}

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {
        console.log(message);
        switch (message.type) {
            case 'statusMessage':
                changeStatus(message.data);
                updateCot();
                break;
            case 'cmdStatus':
                // answerBox.innerHTML = message.data;
                cots.push(message.data);
                updateCot();
                break;
            case 'cotStatus':
                if (message.data != '\nAction: Error  ' && message.data != "\nAction: Answer  " && isRunning && !isPaused) {
                    cots.push(message.data);
                }
                updateCot();
                // cotBox.innerHTML = cots.map((cot, index) => `STEP ${index + 1}: ${cot}<br>`).join('');
                break;
            default:
                break;
        }
    }
);