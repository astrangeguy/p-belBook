// ==UserScript==
// @name           PöbelBook
// @namespace      the-strangeness 
// @description    EEEEYYYY!
// @include        http://www.facebook.com/*
// @include        https://www.facebook.com/*
// @version        0.01
// ==/UserScript==

/*
            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
                    Version 2, December 2004

 Copyright (C) 2004 Sam Hocevar <sam@hocevar.net>

 Everyone is permitted to copy and distribute verbatim or modified
 copies of this license document, and changing it is allowed as long
 as the name is changed.

            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
   TERMS AND CONDITIONS FOR COPYING, DISTRIBUTION AND MODIFICATION

  0. You just DO WHAT THE FUCK YOU WANT TO.
*/

(function() {

var ecma5reduce = function(accumulator){
    var i, l = this.length, curr;
    
    if(typeof accumulator !== "function") // ES5 : "If IsCallable(callbackfn) is false, throw a TypeError exception."
        throw new TypeError("First argument is not callable");

    if((l == 0 || l === null) && (arguments.length <= 1))// == on purpose to test 0 and false.
        throw new TypeError("Array length is 0 and no second argument");
    
    if(arguments.length <= 1){
        curr = this[0]; // Increase i to start searching the secondly defined element in the array
        i = 1; // start accumulating at the second element
    }
    else{
        curr = arguments[1];
    }
    
    for(i = i || 0 ; i < l ; ++i){
        if(i in this)
            curr = accumulator.call(undefined, curr, this[i], i, this);
    }
    
    return curr;
};


if ( !Array.prototype.reduce ) {
  Array.prototype.reduce = ecma5reduce;
}

if ( !Array.reduce ) {
    Array.reduce = function(that /*,args*/) {
        return Array.prototype.reduce.apply(that, [].slice.call(arguments, 1));
    };
}

var ecma5forEach = function( callback, thisArg ) {

    var T, k;

    if ( this == null ) {
        throw new TypeError( " this is null or not defined" );
    }

    // 1. Let O be the result of calling ToObject passing the |this| value as the argument.
    var O = Object(this);

    // 2. Let lenValue be the result of calling the Get internal method of O with the argument "length".
    // 3. Let len be ToUint32(lenValue).
    var len = O.length >>> 0; // Hack to convert O.length to a UInt32

    // 4. If IsCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if ( {}.toString.call(callback) != "[object Function]" ) {
        throw new TypeError( callback + " is not a function" );
    }

    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
    if ( thisArg ) {
        T = thisArg;
    }

    // 6. Let k be 0
    k = 0;

    // 7. Repeat, while k < len
    while( k < len ) {

        var kValue;

        // a. Let Pk be ToString(k).
        //   This is implicit for LHS operands of the in operator
        // b. Let kPresent be the result of calling the HasProperty internal method of O with argument Pk.
        //   This step can be combined with c
        // c. If kPresent is true, then
        if ( k in O ) {

            // i. Let kValue be the result of calling the Get internal method of O with argument Pk.
            kValue = O[ k ];

            // ii. Call the Call internal method of callback with T as the this value and
            // argument list containing kValue, k, and O.
            callback.call( T, kValue, k, O );
        }
        // d. Increase k by 1.
        k++;
    }
    // 8. return undefined
};

if ( !Array.prototype.forEach ) {
  Array.prototype.forEach = ecma5forEach;
}

if ( !Array.forEach ) {
    Array.forEach = function(that /*,args*/) {
        return Array.prototype.forEach.apply(that, [].slice.call(arguments, 1));
    };
}

var multiReplace = function(str, map) {
    var quoted = [];
    Object.keys(map).forEach(function(s) {
        quoted.push(s.replace(/([.?*+^$[\]\\(){}-])/g, "\\$1"));
    });
    var regex = RegExp(quoted.join('|'), 'g');
    return str.replace(regex, function(key) { return map[key]; });
};

var waitTillLoaded = function(id, func) {
    var tries = 4;
    var loop = function() {
        var found = document.getElementById(id);
        if(found) {
            func(found);
        } else if(tries > 0){
            tries = tries - 1;
            setTimeout(loop, 500);
        }
    };
    setTimeout(loop, 100);
};

var modHtml = function(node, map) {
    if(node instanceof Node) {
        node.innerHTML = multiReplace(node.innerHTML, map);
    }
};

var postWalkNodes = function(node, func) {
    if(node && node.childNodes) {
        Array.forEach(node.childNodes, function(cn) { postWalkNodes(cn, func)});
    }
    func(node);
};

var modText = function(text, map) {
    if(text instanceof Text) {
        text.nodeValue = multiReplace(text.nodeValue, map);
    }
};

var modMultiText = function(node, map) {
    postWalkNodes(node, function(cnode) {
        if(cnode instanceof Text) {
            modText(cnode, map);
        }
    });
};

var walkTree = function(elem, path) {
    return path.reduce(function(n, i) { return n? n.childNodes[i] : n }, elem);
};

var walkDelayed = function(node, path, func, trace) {
    trace = trace || function() {};
    trace(node, path);
    if(path.length === 0) {
        func(node);
        return undefined;
    }
    var exit = {};
    try {
        func(path.reduce(function(node, celn, idx, arr) {
            if(node.childElementCount <= celn) {
                var waitnum = celn - node.childNodes.length;
                var restpath = arr.slice(idx + 1);
                var callback = function(ev) {
                    if(waitnum === 0) {
                        waitnum = -1;
                        node.removeEventListener("DOMNodeInserted", callback, false);
                        walkDelayed(ev.target, restpath, func, trace);
                    } else {
                        waitnum = waitnum - 1;
                    }
                }
                node.addEventListener("DOMNodeInserted", callback, false);
                throw exit;
            } else {
                trace(node.childNodes[celn], arr.slice(idx + 1));
                return node.childNodes[celn];
            }
        }, node));
    } catch(e) {
        if(e !== exit) { throw e; }
    }
};

var copyTree = function(elem) {
    if(!elem || !elem.childNodes) { return []; }
    var ret = [elem];
    Array.forEach(elem.childNodes, function(e) {
        ret.push(copyTree(e))
    });
    return ret;
};

var eachAndNewChild = function(node, func) {
    node.addEventListener("DOMNodeInserted", function(e) { func(e.target) }, false);
    Array.forEach(node.childNodes, func);
};

var fixNotifications = function() {
    waitTillLoaded('fbNotificationsList', function(notlst) {
        eachAndNewChild(notlst, function(n) {
            modText(walkTree(n, [0,0,1,0,1]), {'angestupst':'angepöbelt'});
        });
    });
};
/*
fixNotifications();
*/

var fixNotificationPage = function() {
    waitTillLoaded('content', function(content) {
        eachAndNewChild(walkTree(content, [0,0,3,0]), function(day) {
            eachAndNewChild(walkTree(day, [1]), function(note) {
                modText(walkTree(note, [0,2,1]), {'angestupst':'angepöbelt'});
            });
        });
    });
};
/*
fixNotificationPage();
*/


var fixSidebar = function() {
    waitTillLoaded('rightCol', function(rightcol) {
        walkDelayed(rightcol, [0,0,0,0,0,1], function(n) {
            eachAndNewChild(n, function(n) {
                modText(walkTree(n, [1,2,0]), {'angestupst':'angepöbelt'});
                modText(walkTree(n, [1,3,0,1]), {'Zurückstupsen':'Pöbel doch zurück!'});
            });
        });
    });
};
/*
fixSidebar();
*/

var fixAppNames = function() {
    waitTillLoaded('appsNav', function(appsnav) {
        eachAndNewChild(walkTree(appsnav, [1]), function(e) {
            modText(walkTree(e, [1,1,1,0]), {'Anstupser':'Pöbeleien'});
        });
    });
};
/*
fixAppNames();
*/

var fixPokePage = function() {
    waitTillLoaded('pagelet_pokes', function(pokepage) {
        setTimeout(function() {
            modText(walkTree(pokepage, [0,0,1,0,1]), {'Anstupser':'Pöbeleien'});
            eachAndNewChild(walkTree(pokepage, [1]), function(e) {
                var pokecont = walkTree(e, [0,2]);
                modText(walkTree(pokecont, [0,1]), {'angestupst':'angepöbelt'});
                modText(walkTree(pokecont, [1,0,1]), {'Zurückstupsen':'Zurückpöbeln!'});
                if(walkTree(pokecont, [1])) {
                    walkTree(pokecont, [1]).addEventListener("DOMNodeInserted", function(e) {
                        var txt = walkTree(e.target, [0])
                        var name = txt.nodeValue.match(/Du hast (.*) angestupst/)[1];
                        txt.nodeValue = name + ' wurde von dir bepöbelt';
                    }, false);
                }
            });
        }, 100);
    });
};
/*
fixPokePage();
*/


var fixCurrent = function() {
    waitTillLoaded('pagelet_current', function(curr) {
        eachAndNewChild(walkTree(curr, [0,1]), function(n) {
            modText(walkTree(n, [0,0,1,1]), {'angestupst':'angepöbelt'});
        });
    });
};
/*
fixCurrent();
*/

var handleArrowPopup = function(node) {
    var popbody = walkTree(node, [0,0,0]);
    modText(walkTree(popbody, [0,0,0,0,0]), {'Anstupser':'Pöbeleien'});
    eachAndNewChild(walkTree(popbody, [1]), function(n) {
        modText(walkTree(n, [0,1,0,0,0,0,1,0]), {'Zurückstupsen':'Pöbel rum!'});
    });
};


var handleDialog = function(e) {
    walkDelayed(e, [0,0,0], function(content) {
        setTimeout(function() {
            modMultiText(content, {
                'deinen letzten Anstupser noch nicht erhalten':'von der letzten Pöbelei noch nichts mitbekommen'
            });
        }, 500); // FIXME
        walkDelayed(content, [0,0,0], function(title) {
            var name = title.nodeValue.match(/(.*) anstupsen\?/)[1];
            if(name) {
                title.nodeValue = 'Bock auf Randale mit ' + name + '?';
            }
        });
        walkDelayed(content, [1,1,0,1,1], function(body) {
            var name = body.nodeValue.match(/dabei (.*) anzustupsen\./)[1];
            if(name) {
                body.nodeValue = 'Hat ' + name + ' wieder aufgemuckt? Kann ja wohl nicht angehen!';
                return undefined;
            }
        }/*, function(n, p) { trace.push({n: copyTree(n), p: p}); }*/);
        walkDelayed(content, [1,2,1], function(buttons) {
            walkDelayed(buttons, [0,0], function(poke) {
                if(poke.value === 'Anstupsen') {
                    walkDelayed(buttons, [1,0], function(canc) {
                        canc.value = canc.value.replace(/Abbrechen/, '...Weichei!');
                    });
                }
                var text = (Math.random() > 0.5)? 'PÖBELN!' : 'EEEYYYYY!!!';
                poke.value = poke.value.replace(/Anstupsen/, text);
            });
        });
    }/*, function(n, p) { trace.push({n: copyTree(n), p: p}); }*/);
};

var handleBeeper = function(e) {
    setTimeout(function() {
        setMultiText(e, {'angestupst':'angepöbelt'});
    }, 500); // FIXME
};

var dialogListener = function(e) {
    var elem = e.target;
    var arrow = walkTree(elem, [0]);
    if(arrow && arrow.className === 'uiOverlay uiContextualDialog uiOverlayArrowRight') {
        handleArrowPopup(arrow);
    } else if(elem.id.match(/^dialog/)) {
        handleDialog(elem);
    } else if(elem.id === 'BeeperBox') {
        handleBeeper(elem);
    }
};

var catchPopups = function() {
    waitTillLoaded('facebook', function(fb) {
        fb.lastChild.addEventListener("DOMNodeInserted", dialogListener, false);
    });
};
/*
catchPopups();
*/

var fixPokeOpt = function() {
    waitTillLoaded('profile_action_poke', function(pokeact) {
        if(pokeact) {
            var txt = walkTree(pokeact, [0,0,0]);
            var match = null;
            if(match = txt.nodeValue.match(/(.*) anstupsen/)) {
                var name = match[1];
                txt.nodeValue = 'Pöbel mal ' + name + ' an!';
            } else {
                modText(txt, {'Anstupsen':'Bepöbeln'});
            }
        }
    });
};
/*
fixPokeOpt();
*/

var enableStuff = function() {
    var stuff = [
        fixPokeOpt,
        catchPopups,
        fixCurrent,
        fixPokePage,
        fixAppNames,
        fixSidebar,
        fixNotificationPage,
        fixNotifications
    ]
    Array.forEach(stuff, function(fn) {
        try {
            fn();
        } catch(e) {}
    });
    waitTillLoaded('contentCol', function(e) {
        e.addEventListener("DOMNodeInserted", function(e) {
            fixPokePage();
        }, false);
    });
};
///*
setTimeout(enableStuff, 0);
//*/
})();
