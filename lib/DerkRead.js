var webSocket = null;
var cardType = 1;
var isOpen = false;
var isRead = false;
var readInterval = null;
var realCallbackFn = null;
var errorCallbackFn = null;

var lastReadData = null;
var lastReadTime = null;

exports.readCard = function (port) {
  // 手动读卡和读身份证暂不支持
  return 0;
}

exports.openRealReadCard = function (port, realCallback, errorCallback) {
  isOpen = false;
  isRead = false;
  realCallbackFn = realCallback;
  errorCallbackFn = errorCallback;
  lastReadData = null;
  lastReadTime = null;

  if (webSocket && webSocket.readyState === 1) {
    webSocket.close();
    webSocket = null;
  }
  webSocket = new WebSocket("ws://127.0.0.1:9521");
  webSocket.onopen = function () {
    isOpen = true;
  }
  webSocket.onmessage = function (event) {
    if (event && event.data && isRead) {
      var data = event.data;
      if (data == '未查询到设备') {
        if (errorCallbackFn) errorCallbackFn('500', data);
      } else if (data == 'timeout') {
        if (errorCallbackFn) errorCallbackFn('500', '读取超时');
      } else if (data == 'window服务未启动') {
        if (errorCallbackFn) errorCallbackFn('500', data);
      } else if (data == '非有效身份证证件') {
        if (errorCallbackFn) errorCallbackFn('500', data);
      } else if (data.substring(2, 10).toUpperCase() == "00636E81") {
        if (errorCallbackFn) errorCallbackFn('500', "请检查卡片是否放置在发卡器上");
      } else if (isNaN(data) && typeof data !== 'number') {
        if (cardType === 1) {
          var idcardData = JSON.parse(data);
          if (lastReadData && lastReadTime && idcardData.IDCardNo === lastReadData && new Date().getTime() <= lastReadTime + 3000) {
            return;
          }
          lastReadData = idcardData.IDCardNo;
          lastReadTime = new Date().getTime();
          if (realCallbackFn) realCallbackFn({
            name: idcardData.Name || "",
            gender: idcardData.Sex || "",
            code: idcardData.IDCardNo || "",
            birthDay: idcardData.Born || "",
            folk: idcardData.Nation || "",
            address: idcardData.Address || "",
            agency: idcardData.GrantDept || "",
            expireStart: idcardData.UserLifeBegin || "",
            expireEnd: idcardData.UserLifeEnd || "",
          });
        } else if (data && data.length === 8) {
          if (lastReadData && lastReadTime && data === lastReadData && new Date().getTime() <= lastReadTime + 3000) {
            return;
          }
          lastReadData = data;
          lastReadTime = new Date().getTime();
          var array = data.toUpperCase().split('');
          if (realCallbackFn) realCallbackFn({
            code: array[6] + array[7] + array[4] + array[5] + array[2] + array[3] + array[0] + array[1]
          });
        }
      }
    }
  };
  webSocket.onclose = function () {
    isOpen = false;
  }
  webSocket.onerror = function () {
    isOpen = false;
    if (errorCallbackFn) errorCallbackFn('500', '阅读器服务连接失败,确认window服务[IDService]是否启动');
  }
  if (readInterval) {
    clearInterval(readInterval);
    readInterval = null;
  }
  return true;
};

exports.startRealReadCard = function (type) {
  if (readInterval) {
    clearInterval(readInterval);
    readInterval = null;
  }
  lastReadData = null;
  lastReadTime = null;
  if (isOpen) {
    cardType = type || 1;
    if (cardType === 1) {
      readInterval = setInterval(function () {
        // 读身份证信息
        webSocket.send("23262326232623262326");
      }, 500);
    } else {
      setTimeout(function () {
        // 读IC卡号
        webSocket.send("3033A0FFFFFFFFFFFF0405060809");
      }, 500);
    }
    isRead = true;
    return true;
  }
  return false;
};

exports.stopRealReadCard = function () {
  if (readInterval) {
    clearInterval(readInterval);
    readInterval = null;
  }
  lastReadData = null;
  lastReadTime = null;
  if (isOpen) {
    isRead = false;
    return true;
  }
  return false;
};
