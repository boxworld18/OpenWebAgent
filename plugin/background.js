// Extension initialization

let dataUrl = '';

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.set({['status']: 0});
    chrome.storage.local.set({['statusbox']: 0});
    chrome.storage.local.set({['cot']: ''});
    chrome.storage.local.set({['task']: ''});
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log(message);
    switch (message.type) {
        case 'updateTask':
            console.log('updateTask');
            await service(message.data);
            console.log(message.data);
            return true;
        default:
            console.log('[Bg/17]', message);
    }
});

// chrome.runtime.onConnect.addListener((port) => {
//     console.assert(port.name === "content-script");
  
//     port.onMessage.addListener(async (message) => {
//       console.log(message);
  
//       switch (message.type) {
//         case "updateTask":
//           await service(message.data);
//           console.log(message.data);
//           break;
//         default:
//           console.log("[Bg/17]", message);
//       }
//     });
//   });

async function service(package) {
    console.log(package);
    // await chrome.tabs.captureVisibleTab((dataUri) => {
    //     package.screenshot = dataUri;
    // });
    await generateInstructions(package.task, package.screenshot, package.needRefresh, package.model_version);
}

async function getTabId() {
    const [tab] = await chrome.tabs.query({ active: true });
    return tab.id;
}

async function sendMessage(data) {
    return new Promise(async (resolve, reject) => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, data, (response) => {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError);
                return reject(chrome.runtime.lastError);
            }
            console.log(response);
            if (typeof response === 'undefined') response = {};
            resolve(response);
        });
    });
}

async function sendLongMessage(data) {
    console.log(`[SdMsg] before ${data.type}`);
    return new Promise(async (resolve, reject) => {
        const tabs = await chrome.tabs.query({ active: true });
        console.log(tabs[0].id)
        const port = chrome.tabs.connect(tabs[0].id, { name: 'portFromBackground' });

        port.onMessage.addListener((response) => {
            resolve(response);
            port.disconnect();
        });

        port.onDisconnect.addListener(() => {
            if (chrome.runtime.lastError) {
                console.log('[Long message]', chrome.runtime.lastError);
                resolve({
                    'error': chrome.runtime.lastError
                });
            }
        });

        port.postMessage(data);

        setTimeout(() => {
            port.disconnect();
            let emsg = `Error: Timeout`;
            chrome.storage.local.set({ ['cot']: emsg });
            message2Popup('cotStatus', emsg);
            console.error('[Frontend] ' + emsg);
            resolve({
                'error': emsg
            });
        }, 1000000);
    });
}

function message2Popup(type, data) {
    console.log(`[M2Pop] before ${type} ${data}`);
    // set statusbox if needed
    if (type == 'statusMessage') {
        chrome.storage.local.set({ ['statusbox']: data });
        if (data === 0 || data === 4)
            chrome.storage.local.set({ ['status']: 0 });
    }

    // need to handle the situation when popup is not open
    chrome.runtime.sendMessage({ type: type, data: data }, (response) => {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError);
        }
    });

    console.log(`[M2Pop] after ${type} ${data}`);
}

// function message2Popup(type, data, maxRetries = 3, retryInterval = 1000) {
//     console.log(`[M2Pop] before ${type} ${data}`);

//     // set statusbox if needed
//     if (type === 'statusMessage') {
//         chrome.storage.local.set({ ['statusbox']: data });
//         if (data === 0 || data === 4)
//             chrome.storage.local.set({ ['status']: 0 });
//     }

//     const sendMessageWithRetry = (retryCount) => {
//         chrome.runtime.sendMessage({ type, data }, (response) => {
//             if (chrome.runtime.lastError) {
//                 console.error(chrome.runtime.lastError);
//                 if (retryCount < maxRetries) {
//                     console.log(`[M2Pop] Retrying (${retryCount + 1}/${maxRetries})...`);
//                     setTimeout(() => sendMessageWithRetry(retryCount + 1), retryInterval);
//                 } else {
//                     console.error(`[M2Pop] Maximum retries reached. Unable to send message.`);
//                 }
//             }
//         });
//     };

//     sendMessageWithRetry(0);

//     console.log(`[M2Pop] after ${type} ${data}`);
// }

// function message2Popup(type, data, maxRetries = 3, retryInterval = 1000) {
//     console.log(`[M2Pop] before ${type} ${data}`);

//     // set statusbox if needed
//     if (type === 'statusMessage') {
//         chrome.storage.local.set({ ['statusbox']: data });
//         if (data === 0 || data === 4)
//             chrome.storage.local.set({ ['status']: 0 });
//     }

//     const sendMessageWithRetry = (retryCount) => {
//         const port = chrome.runtime.connect({ name: 'popup' });

//         // Handle messages from the popup
//         port.onDisconnect.addListener(() => {
//             console.error('[M2Pop] Popup is closed. Unable to send message.');
//         });

//         port.postMessage({ type, data });

//         // Close the port after sending the message
//         port.disconnect();
//     };

//     sendMessageWithRetry(0);

//     console.log(`[M2Pop] after ${type} ${data}`);
// }


function sleep(time){
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function getStatus() {
    let status = await chrome.storage.local.get(['status']);
    return status.status;
}

async function isRunning() {
    let status = await getStatus();
    return status === 1;
}

function makeCot(instr) {
    let actType = instr.action_type;
    let actStr = instr.action_str;
    let segment = instr.segment;
    let error = instr.error;
    let text = instr.text.replace(/['"]/g, '');
    let cot = '';

    if (!actStr) actStr = '';
    if (!segment || segment === 'None') segment = '';

    if (actType === 'error') {
        cot = actStr.trim();
    } else if (actType === 'finish') {
        if (text.length > 0) return;
    } else {
        actStr = actStr.trim();
        segment = segment.trim();
        cot = `Action: ${actStr}\n`;
        if (segment) cot += ` Segment: ${segment}`;
    }

    console.log(cot);
    chrome.storage.local.set({ ['cot']: cot });
    message2Popup('cotStatus', cot);
}

function base64ToBlob(base64, contentType) {
    console.log(base64);
    const byteCharacters = atob(base64.replace(/^data:image\/(png|jpeg);base64,/, ''));
    const byteArrays = [];
  
    for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
      const slice = byteCharacters.slice(offset, offset + 1024);
  
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
  
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
  
    const blob = new Blob(byteArrays, {type: contentType});
    return blob;
  }

async function captureTab() {
    return new Promise(async (resolve, reject) => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.captureVisibleTab((dataUri) => {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError);
            }
            resolve(dataUri);
        });
    });
}

function getTime() {
    var current_date = new Date();
    var timestamp = current_date.getTime();
    return timestamp;
}

// Function to download data to a file
function download(data, filename) {
    // var file = new Blob([data], {type: 'application/json'});
    // var url = URL.createObjectURL(file);
    var url = "data:," + JSON.stringify(data);
    chrome.downloads.download({
        url,
        filename: filename,
        conflictAction: "overwrite"
    }, (id) => {});
}

var records = [];
async function generateInstructions(task, screenshotUrl, needRefresh, model_version) {
    var op_res = '';
    var refresh = needRefresh;
    if (refresh) records = [];

    var stt = 0, actionList = [], filename = `${getTime()}.json`;
    while (true) {
        var step_info = {};
        if (!await isRunning()) break;

        stt = getTime();
        message2Popup('statusMessage', 1);
        let package = await sendLongMessage({ type:'getInfo' });
        if ('error' in package) {
            console.log(package.error);
            const ans = await sleep(1000);
            continue;
        }
        var time1 = getTime() - stt;
        step_info.fetch_time = time1;
        console.log(`Fetch Info: ${time1}`);

        dataUrl = await captureTab();
        package.screenshot = dataUrl;
        
        package.target = task;
        package.model = 'gpt4';
        package.result = op_res;
        package.refresh = refresh;
        package.model_version = model_version;
        package.history = records;

        console.log("package")
        console.log(package);
        
        if (!await isRunning()) break;
        stt = getTime();
        message2Popup('statusMessage', 2);
        instr = await getInstruction(package);
        if ('error' in instr) {
            console.log(instr.error);
            const ans = await sleep(1000);
            continue;
        }
        var time2 = getTime() - stt;
        console.log(`Instruction generate: ${time2}`);
        step_info.generate_time = time2;

        instr.winY = package.window.y;

        console.log(instr);
        op_res = instr.result;

        Object.assign(step_info, instr.time_status);

        if (!await isRunning()) {
            op_res = 'Stopped';
            break;
        }
        
        if (instr.record) records.push(instr.record);

        stt = getTime();
        message2Popup('statusMessage', 3);
        let result = await sendLongMessage({ type:'runInstruction', instr: instr });
        if ('error' in result) {
            console.log(result.error);
            const ans = await sleep(1000);
            continue;
        }
        var time3 = getTime() - stt;
        console.log(`Run Instruction: ${time3}`);
        step_info.execute_time = time3;
        step_info.action_type = instr.action_type;
        actionList.push(step_info);
        download(actionList, filename);

        console.log(step_info);

        console.log(result);
        var answer = result.message;
        
        makeCot(instr);

        if (answer.length > 0) {
            answer = `Answer: ${answer}`;
            chrome.storage.local.set({ ['answer']: answer });
            message2Popup('cmdStatus', answer);
        }
        
        if (result.status > 0) {
            message2Popup('statusMessage', 4);
            break;
        }

        refresh = false;
        await sleep(2000);
    }

    let status = await getStatus();
    if (status == 0) {
        message2Popup('statusMessage', 0);
    } else if (status == 2) {
        message2Popup('statusMessage', 5);
    }
}

async function getInstruction(package) {
    console.log(package);
    return new Promise((resolve, reject) => {
        fetch('http://localhost:17171/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(package),
            signal: AbortSignal.timeout(60000)
        }).then((response) => {
            if (response.status === 200) {
                return response.json();
            } else {
                let emsg = `Error: Response ${response.status}`;
                chrome.storage.local.set({ ['cot']: emsg });
                message2Popup('cotStatus', emsg);
                return {
                    'error': response.status
                };
            }
        })
        .then(data => {
            console.log(data);
            resolve(data);
        })
        .catch(error => {
            let emsg = `Error: Request Timeout`;
            chrome.storage.local.set({ ['cot']: emsg });
            message2Popup('cotStatus', emsg);
            console.error(error);
            resolve({
                'error': error
            });
        });
    })
}