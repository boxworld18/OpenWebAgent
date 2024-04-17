function sleep(time){
    return new Promise((resolve) => setTimeout(resolve, time));
}

function getXPath(element) {
    var xpath = '';
    while (!(element == undefined)) {
        // Find the element's index within its parent
        if (element.id !== '') {
            xpath = `//*[@id="${element.id}"]` + xpath;
            break;
        }

        // Back to root
        if (element === document.body) {
            xpath = '/html/body' + xpath;
            break;
        }

        const parent = element.parentNode;

        // Element is 'root'
        if (parent == undefined) {
            xpath = '/' + element.tagName.toLowerCase() + xpath;
            break;
        }

        var isFound = false;
        var totIx = 0;
        var ix = 0;

        parent.childNodes.forEach((sibling) => {
            if (sibling === element)
                isFound = true;
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                if (isFound === false) ix++;
                totIx++;
            }
        });

        var suffix = ((totIx > 1) ? `[${ix + 1}]` : '');
        xpath = '/' + element.tagName.toLowerCase() + suffix + xpath;

        // iterate parent node
        element = parent;
    }

    return 'xpath/' + xpath;
}

function getAllElePosNSize(node) {
    record = {};
    if (node.nodeType == Node.ELEMENT_NODE) {
        path = getXPath(node);
        data = node.getBoundingClientRect();
        if (data.x != 0 || data.y != 0 || data.width != 0 || data.height != 0) {
            record[path] = data;
        }
    }
    for (let i = 0; i < node.childNodes.length; i++) {
        record = Object.assign(record, getAllElePosNSize(node.childNodes[i]));
    }
    return record;
}

function checkLoaded() {
    return document.readyState === 'complete' || document.readyState === 'interactive';
}

async function getVimiumLabeledHTML() {
    while (true) {
        // Get marks
        console.log('Waiting for marks...');
        await sleep(2000);
        var vmker = document.getElementById('vimium-marker')
        if (vmker !== null) vmker.click();
        await sleep(1000);

        // Mark Labels
        console.log('Marking labels...');
        const content = document.documentElement.outerHTML;
        var parser = new DOMParser();
        console.log('Parsing...');
        var doc = parser.parseFromString(content, 'text/html');
        var elements = doc.querySelectorAll('.clickable-element');
        console.log(elements);

        if (elements.length === 0) continue;

        console.log('Getting labels...');
        elements.forEach((element) => {
            var tag = element.tagName.toLowerCase();
            if (tag === 'body') return;
            var vimiumZ = element.getAttribute('vimium-z-index');
            var label = doc.querySelector(`div[vimium-label-z-index='${vimiumZ}']`);
            if (label === null) return;
            var vimiumLabel = label.textContent;
            element.setAttribute('temp_clickable_label', vimiumLabel);
        });

        var html = doc.documentElement.outerHTML;
        await sleep(500);

        console.log('Removing marks...');
        // Remove marks
        var vrmker = document.getElementById('vimium-remove-marker')
        if (vrmker !== null) vrmker.click();
        Array.from(document.getElementsByClassName('clickable-element')).forEach(function (element) {
            element.classList.remove('clickable-element');
            element.removeAttribute('vimium-z-index');
            element.removeAttribute('temp_clickable_label');
        });
        return [html];
    }
}

function removeLabelMark() {
    document.querySelectorAll(".our-dom-marker").forEach(item => {
        document.body.removeChild(item);
    });
}

function getRect(packet) {
    selector = packet.selector
    index = packet.startIndex
    var items = Array.prototype.slice.call(
        document.querySelectorAll(selector)
    );

    var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    
    items = items.filter(
        x => !items.some(y => x.contains(y) && !(x == y))
    ).map(element => {
        var bb = element.getClientRects();
        var rect = {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            width: 0,
            height: 0
        };
        var keep = false;
        var text = "", id = -1;
        if (bb.length > 0) {
            bb = bb[0];
            rect = {
                left: Math.max(0, bb.left),
                top: Math.max(0, bb.top),
                right: Math.min(vw, bb.right),
                bottom: Math.min(vh, bb.bottom)
            };
            rect = {
                ...rect,
                width: rect.right - rect.left,
                height: rect.bottom - rect.top
            };
            if (rect.width > 0 && rect.height > 0) {
                keep = true;
                if (index >= 0) { 
                    id = ++index;
                    element.setAttribute("temp_clickable_label", id);
                }
                var childNodes = element.childNodes;
                
                for (var i = 0; i < childNodes.length; i++) {
                    if (childNodes[i].nodeType == Node.TEXT_NODE) {
                        text += childNodes[i].textContent;
                    }
                }
            }
        }
        
        return {
            keep: true,
            id,
            rects: rect,
            tag: element.tagName.toLowerCase?.() || "",
            text,
        };
    }).filter(x => x.keep);

    return [items, index];
}

function mixMarker() {
    var items = Array.prototype.slice.call(
        document.querySelectorAll('*')
    ).map(function(element) {
        var vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
        var vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
        
        var rects = [...element.getClientRects()].filter(bb => {
            var center_x = bb.left + bb.width / 2;
            var center_y = bb.top + bb.height / 2;
            var elAtCenter = document.elementFromPoint(center_x, center_y);
        
            if (!elAtCenter) return false;
            return elAtCenter === element || element.contains(elAtCenter) 
        }).map(bb => {
            const rect = {
                left: Math.max(0, bb.left),
                top: Math.max(0, bb.top),
                right: Math.min(vw, bb.right),
                bottom: Math.min(vh, bb.bottom)
            };
            return {
                ...rect,
                width: rect.right - rect.left,
                height: rect.bottom - rect.top
            }
        });
        // var rects = [];
        var area = rects.reduce((acc, rect) => acc + rect.width * rect.height, 0);
    
        const tagName = element.tagName.toLowerCase?.() || "";
        let isClickable = ((element.onclick != null) || window.getComputedStyle(element).cursor == "pointer");
        
        // Insert area elements that provide click functionality to an img.
        if (tagName === "img") {
            let mapName = element.getAttribute("usemap");
            if (mapName) {
                const imgClientRects = element.getClientRects();
                mapName = mapName.replace(/^#/, "").replace('"', '\\"');
                const map = document.querySelector(`map[name=\"${mapName}\"]`);
                if (map && (imgClientRects.length > 0)) isClickable = true;
            }
        }
    
        if (!isClickable) {
            const role = element.getAttribute("role");
            const clickableRoles = [
                "button",
                "tab",
                "link",
                "checkbox",
                "menuitem",
                "menuitemcheckbox",
                "menuitemradio",
                "radio",
            ];
            if (role != null && clickableRoles.includes(role.toLowerCase())) {
                isClickable = true;
            } else {
                const contentEditable = element.getAttribute("contentEditable");
                if (
                contentEditable != null &&
                ["", "contenteditable", "true"].includes(contentEditable.toLowerCase())
                ) {
                isClickable = true;
                }
            }
        }
    
        // Check for jsaction event listeners on the element.
        if (!isClickable && element.hasAttribute("jsaction")) {
            const jsactionRules = element.getAttribute("jsaction").split(";");
            for (let jsactionRule of jsactionRules) {
                const ruleSplit = jsactionRule.trim().split(":");
                if ((ruleSplit.length >= 1) && (ruleSplit.length <= 2)) {
                const [eventType, namespace, actionName] = ruleSplit.length === 1
                    ? ["click", ...ruleSplit[0].trim().split("."), "_"]
                    : [ruleSplit[0], ...ruleSplit[1].trim().split("."), "_"];
                if (!isClickable) {
                    isClickable = (eventType === "click") && (namespace !== "none") && (actionName !== "_");
                }
                }
            }
        }
    
        if (!isClickable) {
            const clickableTags = [
                "input",
                "textarea",
                "select",
                "button",
                "a",
                "iframe",
                "video",
                "object",
                "embed",
                "details"
            ];
            isClickable = clickableTags.includes(tagName);
        }
        
        if (!isClickable) {
            if (tagName === "label")
                isClickable = (element.control != null) && !element.control.disabled;
            else if (tagName === "img")
                isClickable = ["zoom-in", "zoom-out"].includes(element.style.cursor);
        }

        // An element with a class name containing the text "button" might be clickable. However, real
        // clickables are often wrapped in elements with such class names. So, when we find clickables
        // based only on their class name, we mark them as unreliable.
        const className = element.getAttribute("class");
        if (!isClickable && className && className.toLowerCase().includes("button")) {
            isClickable = true;
        }
    
        // Elements with tabindex are sometimes useful, but usually not. We can treat them as second
        // class citizens when it improves UX, so take special note of them.
        const tabIndexValue = element.getAttribute("tabindex");
        const tabIndex = tabIndexValue ? parseInt(tabIndexValue) : -1;
        if (!isClickable && !(tabIndex < 0) && !isNaN(tabIndex)) {
            isClickable = true;
        }
    
        const idValue = element.getAttribute("id");
        const id = idValue ? idValue.toLowerCase() : "";
        if (isClickable && area == 0) {
            const textValue = element.textContent.trim().replace(/\s{2,}/g, ' ');
            clickable_msg = `${tagName}[id=${id}] ${isClickable} (${area}) ${textValue}`
        }
    
        return {
            element: element,
            include: isClickable,
            area,
            rects,
            text: element.textContent.trim().replace(/\s{2,}/g, ' ')
        };
    }).filter(item =>
        item.include && (item.area >= 1)
    );

    items = items.filter(x => !items.some(y => x.element.contains(y.element) && !(x == y)))

    items.forEach(item => {
        item.element.classList.add('possible-clickable-element');
    });
}

function labelMarker(items){
    items.filter(
        item => item.id > 0
    ).forEach((item) => {
        const bbox = item.rects;
        const id_string = `dom-marker-id-${index}`;
        index = item.id;
        outerElement = document.createElement("div");
        outerElement.classList.add("our-dom-marker");
        // var borderColor = getRandomColor();
        var borderColor = "#FFFF00";
        outerElement.style.outline = `2px dashed ${borderColor}`; 
        outerElement.style.position = "fixed";
        outerElement.style.left = bbox.left - 2 + "px";
        outerElement.style.top = bbox.top - 2 + "px";
        outerElement.style.width = bbox.width + 4 + "px";
        outerElement.style.height = bbox.height + 4 + "px";
        outerElement.style.pointerEvents = "none";
        outerElement.style.boxSizing = "border-box";
        outerElement.style.zIndex = 2147483647;

        innerElement = document.createElement("div");
        innerElement.classList.add("our-dom-marker");
        innerElement.style.outline = `2px dashed #222288`;
        innerElement.style.position = "fixed";
        innerElement.style.left = bbox.left + "px";
        innerElement.style.top = bbox.top + "px";
        innerElement.style.width = bbox.width + "px";
        innerElement.style.height = bbox.height + "px";
        innerElement.style.pointerEvents = "none";
        innerElement.style.boxSizing = "border-box";
        innerElement.style.zIndex = 2147483647;
    
        // Add floating label at the corner
        var label = document.createElement("span");
        label.classList.add("our-dom-marker-text");
        var topPosition = 25;
        if (bbox.top < 25) topPosition = bbox.top;
        label.textContent = index;
        label.style.position = "absolute";
        label.style.top = `-${topPosition}px`;
        label.style.left = "0px";
        label.style.background = borderColor;
        label.style.color = "black";
        label.style.padding = "2px 4px";
        label.style.fontSize = "16px";
        label.style.borderRadius = "2px";
        label.style.fontWeight = "bold";
        outerElement.appendChild(label);
    
        document.body.appendChild(outerElement);
        document.body.appendChild(innerElement);
    })
    return items;
}

function getInput() {
    var items = Array.prototype.slice.call(
        document.querySelectorAll("input, textarea")
    );

    items = items.filter(
        x => !items.some(y => x.contains(y) && !(x == y))
    ).map(element => {
        element.setAttribute("pseudo-value", element.value);
    });

    // items = Array.prototype.slice.call(
    //     document.querySelectorAll("select")
    // );

    // items = items.forEach(element => {
    //     var text = element.options[element.selectedIndex].text;
    //     element.setAttribute("pseudo-value", text);
    // });
}

async function getLabeledHTML() {
    // Mark Labels
    removeLabelMark();
    await sleep(100);

    console.log('Marking labels...');
    mixMarker();
    await sleep(100);

    var [item, idx] = getRect({
        "selector": ".possible-clickable-element",
        "startIndex": 0
    });

    var [ocr_items, idx] = getRect({
        "selector": "canvas",
        "startIndex": -1
    });

    var [svg_items, idx] = getRect({
        "selector": "svg",
        "startIndex": -1
    });

    getInput();

    const items = ocr_items.concat(svg_items);

    labelMarker(item);

    await sleep(100);
    
    var html = document.documentElement.outerHTML;
    return [html, items];
}

async function getPageInfo() {
    let obj = {};
    obj.window = {
        x: window.innerWidth,
        y: window.innerHeight,
        top: window.scrollY,
        left: window.scrollX,
        bottom: window.scrollY + window.innerHeight,
        right: window.scrollX + window.innerWidth
    };
    var [html, ocrItems] = await getLabeledHTML();
    console.log(html);
    obj.html = html;
    obj.ocrItems = ocrItems;
    obj.url = document.URL;
    obj.elementPosNSize = getAllElePosNSize(document.body);
    obj.pageHeight = document.documentElement.scrollHeight;
    return obj;
}

async function executeInstruction(instr) {
    removeLabelMark();

    console.log(instr);
    var act_type = instr.action_type;
    var option = instr.option;
    var elabel = instr.label;
    var xpath = `//*[@temp_clickable_label="${elabel}"]`;
    console.log(xpath);

    var status = 0, message = '';

    console.log(act_type, instr.label);
    console.log(instr);

    try {
        switch (act_type) {
            case 'scroll_up':
                var n = parseFloat(instr.delta);
                var delta_y = -instr.winY * n;
                window.scrollBy(0, delta_y);
                break;
            case 'scroll_down':
                var n = parseFloat(instr.delta);
                var delta_y = instr.winY * n;
                window.scrollBy(0, delta_y);
                break;
            case 'click':
                // var xpath = instr.xpath;
                document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.click();
                break;
            case 'jump_to':
                var url = instr.url;
                window.location.href = url;
                break;
            case 'go_backward':
                window.history.back();
                break;
            case 'go_forward':
                window.history.forward();
                break;
            case 'hover':
                // var xpath = instr.xpath;
                document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue.dispatchEvent(new Event('mouseover', {bubbles: true}));
                break;
            case 'select':
                var element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                element.value = option;
                element.dispatchEvent(new Event('change'));
                break;
            case 'type':
                // var xpath = instr.xpath;
                var text = instr.text.replace(/['"]/g, '');
                var element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                element.value = text;
                element.dispatchEvent(new Event('submit', {bubbles: true}));
                break;
            case 'finish':
                status = 1;
                var text = instr.text.replace(/['"]/g, '');
                message = text;
                console.log('Model Output: ' + text);
                break;
            case 'user_input':
                status = 2;
                console.log('==== Verification ====');
                break;
            default:
                console.log('==== ERROR ====');
                console.log('Command is not valid');
                break;
        }
    } catch {
        
    }

    let obj = {};
    obj.status = status;
    obj.message = message;
    console.log(obj);
    return obj;
    // return status;
}

chrome.runtime.onMessage.addListener(
    async (message, sender, sendResponse) => {
        console.log(message.type);
        try {
            switch (message.type) {
                case 'getInfo':
                    info = await getPageInfo();
                    console.log(info);
                    sendResponse(info);
                    break;
                case 'runInstruction':
                    sendResponse({ success: true });
                    executeInstruction(message.instr);
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error(error);
            sendResponse({ error: 'An error occurred' });
        }
    }
);

chrome.runtime.onConnect.addListener((port) => {
    console.assert(port.name === 'portFromBackground');
    
    port.onMessage.addListener(async (message) => {
        console.log(message.type);
        try {
            switch (message.type) {
                case 'getInfo':
                    const info = await getPageInfo();
                    console.log(info);
                    port.postMessage(info);
                    break;
                case 'runInstruction':
                    const status = await executeInstruction(message.instr);
                    port.postMessage(status);
                    break;
                default:
                    port.postMessage({ error: 'Invalid message type' });
            }
        } catch (error) {
            console.error(error);
            port.postMessage({ error: 'An error occurred' });
        }
    });
});
