var bPC = !navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i);
var bMobileSafari = /Safari/.test(navigator.userAgent) && /iPhone/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

if(bPC) {
  // use upper resolution & read full region on PC
  $('#ul-resolutionList .selectedLi').removeClass('selectedLi');
  $('#ul-resolutionList .li-resolution[data-width="1920"][data-height="1080"]').addClass('selectedLi');
  $('#lb-readFullRegion').click();
}

$('#ul-supportBrowser').foundation();
$('#ul-menu').foundation();
$('#frame-white').hide();

dynamsoft.dbrEnv.resourcesPath = 'https://demo.dynamsoft.com/dbr_wasm/js';
dynamsoft.dbrEnv.licenseKey = "t0068MgAAAKHUBCtgPRN4K2K4LGwxT8X0R54NyMhvqnpNkwguvI5gKi4r0kai6yo5q+PLIMV7a0+FaQUd1zLW8G5Yku/Twc0=";
dynamsoft.dbrEnv.bUseWorker = true;

var bDbrWasmLoadSuccess = false;
dynamsoft.dbrEnv.onAutoLoadWasmSuccess = function() {
  bDbrWasmLoadSuccess = true;

  if(preSelBarcodeFormat) {
    initTestRuntimeSettings().then(function() {
      self.isLooping = true;
      playvideo().then(loopReadVideo, function(ex) {
        alert("Please make sure the camera is connected and the site is deployed in https: " + (ex.message || ex));
      });
    });
  }

  $('#div-highLightResult span').text('reading...');
  $('#frame-loadingAnimation').hide();
  $('.disableOnWasmLoading').removeClass('disableOnWasmLoading');
};

dynamsoft.dbrEnv.onAutoLoadWasmError = function(ex) {
  alert("load wasm failed: "+ (ex.message || ex));
};

$('#frame-supportAndSetting input').change(function() {
  /*Start: walkaround for mobile safari ui delay bug*/
  if(this.checked) {
    $(this).closest('.div-format-switch').css('background','#2ba6cb');
  } else {
    $(this).closest('.div-format-switch').css('background','');
  }
  /*End: walkaround for mobile safari ui delay bug*/

  if($('#frame-supportAndSetting input:checked').length) {
    $('#btn-processSupportAndSettings').removeAttr('disabled');
  } else {
    $('#btn-processSupportAndSettings').attr('disabled', 'disabled');
  }
});

var preSelBarcodeFormat = 0;
$('#btn-processSupportAndSettings').click(function() {
  $('#frame-supportAndSetting').fadeOut();

  var checkedIpts = $('#frame-supportAndSetting input:checked');
  checkedIpts.each(function() {
    preSelBarcodeFormat = preSelBarcodeFormat | this.value;
  });

  if(bDbrWasmLoadSuccess) {
    initTestRuntimeSettings().then(function() {
      self.isLooping = true;
      playvideo().then(loopReadVideo, function(ex) {
        alert("Please make sure the camera is connected and the site is deployed in https: " + (ex.message || ex));
      });
    });
  }
});

var $ulVideoList = $('#ul-videoList');

var bReadFullRegion = false;

var readInterval = 10;

var testRuntimeSettingsReader = null;
var initTestRuntimeSettings = function() {
  testRuntimeSettingsReader = new dynamsoft.BarcodeReader();
  var settings = testRuntimeSettingsReader.getRuntimeSettings();
  settings.mBarcodeFormatIds = preSelBarcodeFormat;
  return testRuntimeSettingsReader.updateRuntimeSettings(settings);
};

var needFixEdge = false;

var playvideo = function(deviceId) {
  return new Promise(function(resolve,reject) {
    var video = $('#video-back')[0];

    if (video.srcObject) {
      video.srcObject.getTracks().forEach(function(track) {
        track.stop();
      });
    }

    var selW = $('#ul-resolutionList .selectedLi').attr('data-width');
    var selH = $('#ul-resolutionList .selectedLi').attr('data-height');
    var constraints = {
      video: {
        facingMode: { ideal: 'environment' }
      }
    };

    if(bMobileSafari) {
      if(selW >= 1280) {
        constraints.video.width = 1280;
      } else if(selW >= 640) {
        constraints.video.width = 640;
      } else if(selW >= 320) {
        constraints.video.width = 320;
      }
    } else {
      constraints.video.width = { ideal: selW };
      constraints.video.height = { ideal: selH };
    }

    if(!deviceId) {
      var $selectedLi = $ulVideoList.children('.selectedLi');
      if($selectedLi.length) {
        deviceId = $selectedLi[0].dataVal;
      }
    }

    if(deviceId) {
      constraints.video.facingMode = undefined;
      constraints.video.deviceId = {exact: deviceId};
    }

    var hasTryedNoWidthHeight = false;
    var getAndPlayVideo = function() {
      navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        return new Promise(function(resolve2, reject2) {
          video.srcObject = stream;
          video.onloadedmetadata = function() {
            video.play().then(function() {
              if(needFixEdge) {
                var dw = $(document).width(), dh = $(document).height();

                if(video.videoWidth / video.videoHeight > dw / dh){
                  video.style.width = Math.round(video.videoWidth / video.videoHeight * dh) + 'px';
                  video.style.height = dh + 'px';
                } else {
                  video.style.width = dw + 'px';
                  video.style.height = Math.round(video.videoHeight / video.videoWidth * dw) + 'px';
                }
              }

              resolve2();
            },function(ex) {
              reject2(ex);
            });
          };

          video.onerror = function() {reject2();};
        });
      }).then(function() {
        resolve();
      }).catch(function(ex) {
        if(!hasTryedNoWidthHeight) {
          hasTryedNoWidthHeight = true;
          constraints.video.width = undefined;
          constraints.video.height = undefined;
          getAndPlayVideo();
        }else{
          reject(ex);
        }
      });
    };
    getAndPlayVideo();
  });
};

var isLooping = false;
var loopReadVideo = function() {
  if(!isLooping) {
    return;
  }

  var video = $('#video-back')[0];
  if(video.paused) {
    return setTimeout(loopReadVideo, 1000);
  }

  var videoRealW = video.videoWidth;
  var videoRealH = video.videoHeight;
  var sx, sy, sWidth, sHeight, dWidth, dHeight;

  if(bReadFullRegion) {
    sx = sy = 0;
    sWidth = dWidth = videoRealW;
    sHeight = dHeight = videoRealH;
  } else {
    var vw = $(document).width();
    var vh = $(document).height();
    var videoInDocRealW, videoInDocRealH;
    if(vw / vh < videoRealW / videoRealH) {
      videoInDocRealW = vw / vh * videoRealH;
      videoInDocRealH = videoRealH;
    } else {
      videoInDocRealW = videoRealW;
      videoInDocRealH = vh / vw * videoRealW;
    }

    var regionRealWH = Math.round(/*0.6 * */Math.min(videoInDocRealW, videoInDocRealH));//looks like 0.6, real is 1
    sx = Math.round((videoRealW - regionRealWH)/2);
    sy = Math.round((videoRealH - regionRealWH)/2);
    sWidth = sHeight = dWidth = dHeight = regionRealWH;
  }

  var timestart = null;
  var barcodeReader = new dynamsoft.BarcodeReader();
  barcodeReader.updateRuntimeSettings(testRuntimeSettingsReader.getRuntimeSettings()).then(function() {
    timestart = (new Date()).getTime();
    return barcodeReader.decodeVideo(video,sx,sy,sWidth,sHeight,dWidth,dHeight);
  }).then(function(results) {
    var bestConfidence = 0, bestTxt = undefined, txtArr = [];
    for(var i=0;i<results.length;++i) {
      var result = results[i];
      var confidence = result.LocalizationResult.ExtendedResultArray[0].Confidence;

      if(confidence > 30) {
        txtArr.push(result.BarcodeText);

        if(confidence > bestConfidence) {
          bestConfidence = confidence;
          bestTxt = result.BarcodeText;
        }
      }
    }

    //add to top log
    var $divTopLog = $('#div-topLog');
    for(var i = 0; i < txtArr.length; ++i) {
      var pTopLog = document.createElement("p");
      pTopLog.style.display = 'none';
      pTopLog.innerText = txtArr[i];
      $divTopLog.append(pTopLog);
      $(pTopLog).slideDown();
      var pTopLogs = $divTopLog.children();

      if(pTopLogs.length > $divTopLog.height() / $(pTopLogs[0]).outerHeight(true)) {
        $(pTopLogs[0]).remove();
      }
    }

    if(bestTxt) {
      if(!bestTxt.startsWith('http') && (
        bestTxt.startsWith('www') ||
        -1 != bestTxt.indexOf('.com') ||
        -1 != bestTxt.indexOf('.net') ||
        -1 != bestTxt.indexOf('.org') ||
        -1 != bestTxt.indexOf('.edu')
      )){
        bestTxt = 'http://' + bestTxt;
      }

      if($('#div-highLightResult').children('a,span')[0].innerText != bestTxt) {
        var a;

        if(bestTxt.startsWith('http')) {
          a = document.createElement('a');
          a.href = bestTxt;
        } else {
          a = document.createElement('span');
        }

        a.innerText = bestTxt;
        $('#div-highLightResult')[0].innerHTML = "";
        $('#div-highLightResult').append(a);
      }
    }

    barcodeReader.deleteInstance();
    setTimeout(loopReadVideo, readInterval);
  }).catch(function(ex) {
    barcodeReader.deleteInstance();
    setTimeout(loopReadVideo, readInterval);
    throw ex;
  });
};
