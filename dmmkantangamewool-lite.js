// ==UserScript==
// @name         DMM Kantangame Wool Lite
// @namespace    https://www.youtube.com/watch?v=dQw4w9WgXcQ
// @version      beta-1.1.2
// @description  Always win DMM Kantangame game, score number is automatically generated and statistically reasonable
// @author       Pandamon
// @match        https://pointclub.kantangame.com/easygame/game/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/pandamon/DMMKantangameWool/refs/heads/main/dmmkantangamewool-lite.js
// @updateURL    https://raw.githubusercontent.com/pandamon/DMMKantangameWool/refs/heads/main/dmmkantangamewool-lite.js

// ==/UserScript==

(function() {
    'use strict';

    // for debug
    // unsafeWindow.GM_getValue = GM_getValue;
    // unsafeWindow.GM_setValue = GM_setValue;
    // unsafeWindow.GM_deleteValue = GM_deleteValue;
    // unsafeWindow.GM_listValues = GM_listValues;
    // unsafeWindow.GM = GM;


    // some special game info, not in gameInfoDict
    const typePickGameInfoDict = {
        // 37
        "586": {
            gameid: "586",
            scoreInfo: {
                type: "pick",
                scoreParam: {
                    winList: [1500],
                    loseList: [0]
                }
            }
        },
        // 31
        "573": {
            gameid: "573",
            scoreInfo: {
                type: "pick",
                scoreParam: {
                    winList: [410],
                    loseList: [0]
                }
            }
        },
        "48": {
            gameid: "48",
            scoreInfo: {
                type: "pick",
                scoreParam: {
                    winList: [300],
                    loseList: [10, 20, 30, 40]
                }
            }
        },
        "52": {
            gameid: "52",
            scoreInfo: {
                type: "pick",
                scoreParam: {
                    winList: [27, 30],
                    loseList: [0, 1, 2, 3, 4]
                }
            }
        },
        // "410": {
        //     gameid: "410",
        //     scoreInfo: {
        //         type: "interval",
        //         scoreParam: {
        //             winScore: 95,
        //             loseScore: 70,
        //             limitScore: 99,
        //             singleTick: 1
        //         }
        //     }
        // },
        "460": {
            gameid: "460",
            scoreInfo: {
                type: "pick",
                scoreParam: {
                    winList: [78],
                    loseList: [18, 27, 36, 45, 54]
                }
            }
        }
    }


    // util functions

    let clearGMstorage = function(){
        let keylist = GM_listValues();
        for(let i = 0; i < keylist.length; i++){
            GM_deleteValue(keylist[i]);
        }
        return;
    }
    unsafeWindow.clearGMstorage = clearGMstorage;

    let extractNumber = function (string) {
        return parseInt(string.replace(/[^0-9]/g, ""));
    }

    // this script functions

    let isLogin = function () {
        let loginHallmark = document.querySelector("div.c-n-game-ranking-sec");
        if (loginHallmark) {
            return true;
        } else {
            return false;
        }
    }

    let getGameid = function(gameLink){
        // input string link, return string format id
        let gameURL = new URL(gameLink);
        return gameURL.pathname.match(/\d+$/)[0];
    }

    // makeGameInfo function
    let makeGameInfo = function () {
        // use in game page
        // output template: 
        //{"0":{
        //     gameid:"0",
        //     scoreInfo:{
        //         type:"interval",
        //         scoreParam:{
        //             winScore:10000,
        //             loseScore:4000,
        //             limitScore:12000,
        //             singleTick:100
        //         }
        //     },
        // }
        let findUpperLimit = function (targetScore, rankmax) {
            if (rankmax > 1.2 * targetScore) {
                // target score > 1.2 * max ranking score
                return Math.floor(1.2 * targetScore);
            } else if (rankmax <= targetScore) {
                // target score < max ranking score
                return targetScore;
            } else {
                // target score < max ranking score < 1.2 * target score
                return rankmax;
            }
        }
        let findFactor = function (rankingArray) {
            let factorValueList = [500, 250, 200, 100, 50, 25, 20, 10, 5, 2];     // not need 1, if all fail return 1
            let passCheckRatio = 0.8;
            for (let i = 0; i < factorValueList.length; i++) {
                let notZeroCount = 0;
                for (let j = 0; j < rankingArray.length; j++) {
                    if (rankingArray[j] % factorValueList[i]) {
                        notZeroCount++;
                    }
                }
                if (notZeroCount <= rankingArray.length * (1 - passCheckRatio)) {
                    return factorValueList[i];
                }
            }
            return 1;
        };
        let extractRankingArray = function (rankingNodelist) {
            let rankingArray = [...new Set(Array.from(rankingNodelist, node => extractNumber(node.textContent)))];
            rankingArray = rankingArray.filter(item => !Number.isNaN(item));
            return rankingArray;
        }
        let gameInfo = {};
        let gameid = getGameid(unsafeWindow.location.href);
        let targetScoreNodeList = document.querySelectorAll("div.c-n-game-sec__body > ul.c-n-game-goal-score > li.c-n-game-goal-score__score > div");
        if (!targetScoreNodeList) {
            throw Error("Get game page error");
        }
        let rankingNodeList = document.querySelectorAll("div.c-n-game-ranking > ul.c-n-game-ranking__l-list > li.c-n-game-ranking__list > span.c-n-game-ranking__score");
        let winScore = extractNumber(targetScoreNodeList[0].textContent);
        let loseScore = extractNumber(targetScoreNodeList[3].textContent);
        let rankingMax = 0;
        let singleTick = 0;
        let rankingArray = [];
        if (rankingNodeList.length > 0) {
            rankingArray = extractRankingArray(rankingNodeList);
            rankingMax = Math.max(...rankingArray);
            singleTick = findFactor(rankingArray);
        } else {
            rankingMax = winScore;
            singleTick = 1;
        }
        // if (gameid in gameInfoDict){
        //     singleTick = gameInfoDict[gameid].scoreInfo.scoreParam.singleTick;
        // }
        let limitScore = findUpperLimit(winScore, rankingMax);
        gameInfo[gameid] = {
            gameid: gameid,
            scoreInfo: {
                type: "interval",
                scoreParam: {
                    winScore: winScore,
                    loseScore: loseScore,
                    limitScore: limitScore,
                    singleTick: singleTick
                }
            }
        };
        return gameInfo;
    }
    unsafeWindow.makeGameInfo = makeGameInfo; // for debug

    let makeRandomScore = function (scoreInfo, outcome) {
        // generate random score based on scoreParam
        // outcome: "win" or "lose"
        let randomValueFromInterval = function (lowerBound, upperBound, singleTick) {
            if (lowerBound == upperBound) {
                return lowerBound;
            }
            if (singleTick == 1) {
                return lowerBound + Math.floor((upperBound - lowerBound) * Math.random());
            } else {
                let minMultiplier = Math.ceil(lowerBound / singleTick);
                let maxMultiplier = Math.ceil(upperBound / singleTick);
                let multiplier = minMultiplier + Math.floor((maxMultiplier - minMultiplier) * Math.random());
                return multiplier * singleTick;
            }
        }
        let pickFromList = function (list) {
            let index = Math.floor(list.length * Math.random());
            return list[index];
        }
        if (scoreInfo.type == "interval") {
            // interval
            if (outcome == "win") {
                // win
                return randomValueFromInterval(scoreInfo.scoreParam.winScore, scoreInfo.scoreParam.limitScore, scoreInfo.scoreParam.singleTick);
            } else if (outcome == "lose") {
                // lose
                return randomValueFromInterval(0, scoreInfo.scoreParam.loseScore, scoreInfo.scoreParam.singleTick);
            }
        } else if (scoreInfo.type == "pick") {
            // pick
            if (outcome == "win") {
                // win
                return pickFromList(scoreInfo.scoreParam.winList);
            } else if (outcome == "lose") {
                // lose
                return pickFromList(scoreInfo.scoreParam.loseList);
            }
        } else {
            // error
            throw Error("generate score error")
        }
    }

    let hookEasygameGetReward = function(){
        const _getReward = unsafeWindow.easygame.getReward;
        unsafeWindow.easygame.getReward = function(){
            console.log('I dont watch Ads but get Ads reward');
            return _getReward.apply(this, [true, false]);
        }
    }

    let noAdsEasygameHealing = function(){
        $(easygame.gameHealingBtn).off('click');
        $(easygame.gameHealingBtn).on('click', function () {
            $(easygame.gameHealingBtn).hide();
            console.log('I dont watch Ads but get healing')
            easygame.healing();
        });
    }


    // contributed by tvone
    let hookAjaxFinishScore = function (gameid, outcome) {
        const originalAjax = $.ajax;

        $.ajax = function (...args) {
            const options = args[0] || {};
            const requestUrl = options.url || "";
            if (
                requestUrl.includes("/finish.json") &&
                options.data &&
                typeof options.data.score !== "undefined"
            ) {
                let gameInfo;
                if (gameid in typePickGameInfoDict) {
                    gameInfo = typePickGameInfoDict[gameid];
                } else {
                    gameInfo = makeGameInfo()[gameid];
                }
                const score = makeRandomScore(gameInfo.scoreInfo, outcome);
                // console.log("New Score", score);
                options.data.score = score;
                const shaObj = new jsSHA("SHA-1", "TEXT");
                const hashString =
                    options.data.user_id +
                    options.data.media_id +
                    options.data.game_id +
                    options.data.score +
                    options.data.key;
                shaObj.update(hashString);
                options.data.hash = shaObj.getHash("HEX");
            }

            return originalAjax.apply(this, args);
        };
    }


    // main func

    let autoFinishWinAfterDelay = function(gameid, seconds){
        const delaySec = (typeof seconds === 'number') ? seconds : (8 + Math.random() * 2);
        const ms = Math.round(delaySec * 1000);
        console.log('autoFinish: 延迟设置为 ' + delaySec.toFixed(2) + ' 秒');
        setTimeout(function(){
            try {
                console.log('autoFinish: 尝试在页面上触发结算（胜利）');
                const eg = unsafeWindow.easygame || window.easygame;
                const tryFns = ['finish','finishGame','finish_game','end','complete','gameFinish','submitResult','sendResult','gameOver'];
                let called = false;
                if (eg) {
                    for (let fn of tryFns) {
                        if (typeof eg[fn] === 'function') {
                            try { eg[fn](); called = true; console.log('autoFinish: 调用了 easygame.' + fn); break; } catch (e) { console.error(e); }
                        }
                    }
                }
                if (!called) {
                    const keywords = ['finish','submit','send','result','end','complete','結果','リザルト','終了','送信','受け取'];
                    const buttons = document.querySelectorAll('button,a,input[type="button"],input[type="submit"]');
                    for (let btn of buttons) {
                        if (!btn || !btn.textContent) continue;
                        const text = btn.textContent.trim().toLowerCase();
                        for (let kw of keywords) {
                            if (text.indexOf(kw.toLowerCase()) !== -1) {
                                try { btn.click(); called = true; console.log('autoFinish: 点击按钮触发结算 ->', text); } catch (e) { console.error(e); }
                                break;
                            }
                        }
                        if (called) break;
                    }
                }
                if (!called) {
                    try {
                        if (typeof $ !== 'undefined' && typeof $.ajax === 'function') {
                            $.ajax({
                                url: '/easygame/finish.json',
                                method: 'POST',
                                data: { game_id: gameid },
                            });
                            console.log('autoFinish: 发送回退 finish 请求（不保证包含必要字段）');
                        }
                    } catch (e) { console.error(e); }
                }
            } catch (e) {
                console.error('autoFinish error', e);
            }
        }, ms);
    }

    let autoClaimRewardAndStartNext = function(gameid, secondsAfterFinish){
        const ms = (secondsAfterFinish || 2) * 1000;
        setTimeout(function(){
            try {
                console.log('autoClaim: 尝试领取奖励并开始下一次小游戏');
                const eg = unsafeWindow.easygame || window.easygame;
                // 先尝试通过 easygame.getReward
                if (eg && typeof eg.getReward === 'function') {
                    try { eg.getReward(); console.log('autoClaim: 调用了 easygame.getReward()'); } catch(e){ console.error(e); }
                }

                // 尝试点击可能的领取奖励或下一局按钮
                const rewardKeywords = ['受け取る','受取','取得','领取','Get Reward','受領','報酬','受け取り','受取る','受け取','受け取る','受け取ります','受領する','次へ','次に進む','次へ進む','もう一度','Play Again','Play Next','Next','Start','開始','スタート','戻る','もう一回'];
                const anchors = Array.from(document.querySelectorAll('button,a,input[type="button"],input[type="submit"]'));
                let clicked = false;
                for (let el of anchors) {
                    const txt = (el.textContent || el.value || '').trim();
                    if (!txt) continue;
                    const lower = txt.toLowerCase();
                    for (let kw of rewardKeywords) {
                        if (lower.indexOf(kw.toLowerCase()) !== -1) {
                            try { el.click(); clicked = true; console.log('autoClaim: 点击 ->', txt); } catch (e) { console.error(e); }
                            break;
                        }
                    }
                    if (clicked) break;
                }

                // 如果没有找到按钮，尝试寻找下一局链接（/easygame/game/ID）
                if (!clicked) {
                    const links = Array.from(document.querySelectorAll('a')); 
                    for (let a of links) {
                        if (!a.href) continue;
                        if (/\/easygame\/game\/[0-9]+/.test(a.getAttribute('href'))) {
                            try { a.click(); clicked = true; console.log('autoClaim: 点击下一局链接 ->', a.href); } catch(e){ console.error(e); }
                            break;
                        }
                    }
                }

                // 作为最后手段，尝试使用 AJAX 请求启动下一局（仅作尝试，不保证服务器接受）
                if (!clicked) {
                    try {
                        if (typeof $ !== 'undefined' && typeof $.ajax === 'function') {
                            $.ajax({
                                url: '/easygame/game/' + gameid,
                                method: 'GET'
                            });
                            console.log('autoClaim: 发送 GET 请求尝试打开下一局（备选）');
                        }
                    } catch (e) { console.error(e); }
                }
            } catch (e) {
                console.error('autoClaim error', e);
            }
        }, ms);
    }

    let main = async function(){
        console.log("game page main func");
        let currentGameid = getGameid(unsafeWindow.location.href);
        hookAjaxFinishScore(currentGameid, "win");
        hookEasygameGetReward();
        noAdsEasygameHealing();
        // 在打开小游戏后 10 秒尝试自动触发结算为胜利
        autoFinishWinAfterDelay(currentGameid, 10);
        // 在结算后尝试领取奖励并开始下一局（稍延迟）
        autoClaimRewardAndStartNext(currentGameid, 12);
        return;
    }
    
    // const mediaid = "141"; // DMM
    let gamePagePathRE = /\/easygame\/game\/[0-9]+$/gi;
    let currentURL = new URL(window.location.href);

    if (currentURL.hostname == "pointclub.kantangame.com") {
        if (gamePagePathRE.test(currentURL.pathname)) {
            if (isLogin()){
                console.log("this is game page");
                main();
            }
        }
    }
})();