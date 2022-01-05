//LINE
const LINE_ACCESS_TOKEN = ""
const LINE_END_POINT = "https://api.line.me/v2/bot/message/reply"

//MicroSoft Azure Face API
const FACE_API_SUBSCRIPTION_KEY = ""
const FACE_API_PERSON_GROUP = ""
const FACE_API_BASE_END_POINT = "https://japaneast.api.cognitive.microsoft.com/face/v1.0/"

//DMM
// var DMM_API_ID = PROPERTIES.getProperty('DMM_API_ID')
// var DMM_AFFILIATE_ID = PROPERTIES.getProperty('DMM_AFFILIATE_ID')

//LINEからPOSTリクエストを受けたときに起動
function doPost(e){
  const json = JSON.parse(e.postData.contents);
  const replyToken= json.events[0].replyToken;
  const imageEndpoint = json.events[0].message.text;

  let messageId
  let lineImageUrl
  let lineImageResponse
  if (typeof imageEndpoint === "undefined") {
    messageId = json.events[0].message.id;
    lineImageUrl = "https://api.line.me/v2/bot/message/" + messageId + "/content/";
    lineImageResponse = UrlFetchApp.fetch(lineImageUrl, {
      'headers': {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN
      },
      'method': 'get'
    }).getContent()
  }
  //log(`imageEndpoint=${imageEndpoint}`)
  const faceId = typeof imageEndpoint === "undefined" ? detectFaceImg(lineImageResponse) : detectFaceId(imageEndpoint)
  //log(`faceId=${faceId}`)
  const personIdAndConfidence = getPersonIdAndConfidence(faceId)
  //log(`personIdAndConfidence=${personIdAndConfidence}`)
  const personId = personIdAndConfidence["personId"]
  //log(`personId=${personId}`)
  const confidence = personIdAndConfidence["confidence"]
  //log(`confidence=${confidence}`)
  const name = getActressName(personId)
  //log(`name=${name}`)
  // const profileImageUrlAndItemsInfoUrl = getProfileImageUrlAndItemsInfoUrl(name)
  // const profileImageUrl = profileImageUrlAndItemsInfoUrl.profileImageUrl
  // const itemsInfoUrl = profileImageUrlAndItemsInfoUrl.itemsInfoUrl
  sendLine(name, confidence, replyToken)
}

function detectFaceId(uri){
  const end_point = FACE_API_BASE_END_POINT + "detect"
  try {
    const payload = {
      "url":uri
    }
    const headers = {
      "Ocp-Apim-Subscription-Key": FACE_API_SUBSCRIPTION_KEY,
      "Content-Type": "application/json"
    };
    const res = UrlFetchApp.fetch(
        end_point,
        {
          'method': 'POST',
          'headers': headers,
          'payload': JSON.stringify(payload),
          'muteHttpExceptions': true
        }
    );
    const resParsed = JSON.parse(res)
    return resParsed[0]["faceId"]
  } catch (e){
    //log(e)
    return e
  }
}

function detectFaceImg(binary){
  const end_point = FACE_API_BASE_END_POINT + "detect"
  try {
    const headers = {
      "Content-Type": "application/octet-stream",
      "Ocp-Apim-Subscription-Key": FACE_API_SUBSCRIPTION_KEY
    };
    const res = UrlFetchApp.fetch(
        end_point,
        {
          'method': 'POST',
          'headers': headers,
          'payload': binary,
          'muteHttpExceptions': true
        }
    );
    const resParsed = JSON.parse(res)
    return resParsed[0]["faceId"]
  } catch (e){
    //log(e)
    return e
  }
}

function getPersonIdAndConfidence(faceId){
  const end_point = FACE_API_BASE_END_POINT + "identify"
  try{
    const headers = {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": FACE_API_SUBSCRIPTION_KEY
    };

    const payload = {
      "faceIds" :[faceId],
      "personGroupId" :FACE_API_PERSON_GROUP,
    }
    const res = UrlFetchApp.fetch(
        end_point,
        {
          'method': 'POST',
          'headers': headers,
          'payload': JSON.stringify(payload),
          'muteHttpExceptions': true
        }
    );
    //log(`res=${res}`)
    const resParsed = JSON.parse(res)
    var personId = resParsed[0]["candidates"][0]["personId"]
    var confidence = resParsed[0]["candidates"][0]["confidence"]
    return {
      "personId": personId,
      "confidence": confidence
    }
  } catch (e){
    //log(e)
    return e
  }
}

function getActressName(personId){
  //log(personId)
  const end_point = FACE_API_BASE_END_POINT + "persongroups/" + FACE_API_PERSON_GROUP + "/persons/" + personId
  try {
    const headers = {
      "Content-Type": "application/json",
      "Ocp-Apim-Subscription-Key": FACE_API_SUBSCRIPTION_KEY
    };
    const res = UrlFetchApp.fetch(
        end_point,
        {
          'method': 'GET',
          'headers': headers,
          'muteHttpExceptions': true
        }
    );
    const resParsed = JSON.parse(res)
    return resParsed["name"] //女優名
  } catch (e){
    //log(e)
    return e
  }
}

function getProfileImageUrlAndItemsInfoUrl(name){
  try {
    const encoded_query = encodeURI(name); //パーセントエンコーディングを行う
    const DMM_end_point = "https://api.dmm.com/affiliate/v3/ActressSearch?"
        + "api_id=" + DMM_API_ID
        + "&affiliate_id=" + DMM_AFFILIATE_ID
        + "&keyword=" + encoded_query
        + "&output=json"
    const response = UrlFetchApp.fetch(DMM_end_point)
    const txt = response.getContentText();
    const json = JSON.parse(txt);
    const actress = json.result.actress[0]
    let profileImageUrl = actress.imageURL.large
    profileImageUrl = profileImageUrl.replace(/^http?\:\/\//i, "https://");
    Logger.log("プロフィール画像を取得しました： " + profileImageUrl)
    const itemsInfoUrl = actress.listURL.digital
    itemsInfoUrl = itemsInfoUrl.replace(/^http?\:\/\//i, "https://");
    Logger.log("女優情報詳細ページURLを取得しました： " + itemsInfoUrl)
    return {
      "profileImageUrl":profileImageUrl,
      "itemsInfoUrl": itemsInfoUrl
    }
  } catch (e){
    //log(e)
    return e
  }
}

function sendLine(name, confidence, replyToken){
  if (typeof confidence === "undefined"){
    var messages = [{
      "type": "template",
      "altText": "すまん、みつからんかったのじゃ",
      "template": {
        "type": "buttons",
        "thumbnailImageUrl": 'https://www.oki-ana.com/wp-content/uploads/2018/11/1-e1542693524581.jpg',
        "title": "あなたのスケベな願望に答えられませんでした。",
        "text": "一致するAV女優が見つかりませんでした。Googleで画像検索してください",
        "actions": [
          {
            "type": "uri",
            "label": "検索する",
            "uri": "https://www.google.com/"
          }
        ]
      }
    }];
  } else{
    var messages = [{
      "type": "template",
      "altText": "おすすめのAV女優はこれじゃ。",
      "template": {
        "type": "buttons",
        "thumbnailImageUrl": 'https://www.oki-ana.com/wp-content/uploads/2018/11/1-e1542693524581.jpg',
        "title": name,
        "text": "一致度は" + (Math.round(confidence * 100)) + "%じゃ",
        "actions": [
          {
            "type": "uri",
            "label": "検索する",
            "uri": "https://www.google.com/"
          }
        ]
      }
    }];
  }
  try {
    UrlFetchApp.fetch(LINE_END_POINT, {
      'headers': {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer ' + LINE_ACCESS_TOKEN,
      },
      'method': 'post',
      'payload': JSON.stringify({
        'replyToken': replyToken,
        'messages': messages,
      }),
    });
    return ContentService.createTextOutput(JSON.stringify({'content': 'post ok'})).setMimeType(ContentService.MimeType.JSON);
  } catch (e){
    log(e)
  }
}
