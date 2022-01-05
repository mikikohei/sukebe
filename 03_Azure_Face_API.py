import requests
import json
import logging
import pandas as pd
import io,sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from time import sleep

BASE_URL = "https://japaneast.api.cognitive.microsoft.com/face/v1.0/"
SUBSCRIPTION_KEY = ""
GROUP_NAME = ""

def makeGroup():
   end_point = BASE_URL + "persongroups/" + GROUP_NAME
   payload = {
       "name": GROUP_NAME
   }
   headers = {
       "Ocp-Apim-Subscription-Key" :SUBSCRIPTION_KEY
   }
   r = requests.put(
       end_point,
       headers = headers,
       json = payload
   )
   print (r.text)

def makePerson(name):
   end_point = BASE_URL + "persongroups/" + GROUP_NAME + "/persons"
   print(end_point)
   headers = {
       "Ocp-Apim-Subscription-Key" :SUBSCRIPTION_KEY
   }
   payload = {
       "name": name
   }
   r = requests.post(
       end_point,
       headers = headers,
       json = payload
   )
   print (r.text)
   try:
     personId = r.json()["personId"]
   except Exception as e:
     personId = None
     print(r.json()["error"])
   return personId

def addFaceToPerson(personId, imageUrl):
   end_point = BASE_URL + "persongroups/" + GROUP_NAME + "/persons/" + personId  + "/persistedFaces"
   print(end_point)
   headers = {
       "Ocp-Apim-Subscription-Key" :SUBSCRIPTION_KEY
   }
   payload = {
       "url": imageUrl
   }
   r = requests.post(
       end_point,
       headers = headers,
       json = payload
   )
   print(r.text)

def trainGroup():
   end_point = BASE_URL + "persongroups/" + GROUP_NAME + "/train"
   headers = {
       "Ocp-Apim-Subscription-Key" :SUBSCRIPTION_KEY
   }
   r = requests.post(
       end_point,
       headers = headers,
   )
   print(r.text)

def detectFace(imageUrl):
  end_point = BASE_URL + "detect"
  headers = {
      "Ocp-Apim-Subscription-Key" :SUBSCRIPTION_KEY
  }
  payload = {
      "url": imageUrl
  }
  r = requests.post(
      end_point,
      json = payload,
      headers = headers
  )
  try:
      faceId = r.json()[0]["faceId"]
      print ("faceId Found:{}".format(faceId))
      return r.json()[0]
  except Exception as e:
      print("faceId not found:{}".format(e))
      return None

def identifyPerson(faceId):
  end_point = BASE_URL + "identify"
  headers = {
      "Ocp-Apim-Subscription-Key" :SUBSCRIPTION_KEY
  }
  faceIds = [faceId]
  payload = {
      "faceIds" :faceIds,
      "personGroupId" :GROUP_NAME,
  }
  r = requests.post(
      end_point,
      json = payload,
      headers = headers
  )
  print(r.text)
  try:
      candidates = r.json()[0]["candidates"]
      print ("candidates Found:{}".format(candidates))
      return r.json()[0]
  except Exception as e:
      print("candidates not found:{}".format(e))
      return None

def getPersonNameByPersonId(personId):
    end_point = BASE_URL + 'persongroups/' + GROUP_NAME + '/persons'
    result = requests.get(
        end_point,
        headers = {
        "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY
        },
        json = {
            'personGroupId': GROUP_NAME
        }
    )
    persons = json.loads(result.text)
    for person in persons:
        if person['personId'] == personId:
            return person['name']

if __name__ == '__main__':

  makeGroup()

  #pandasでCSVからAV女優を学習
  #AV女優のリストを取得
  df = pd.read_csv("romaned.csv",index_col=0)
  df2 = pd.read_csv("learning-default.csv", index_col=0)
  for i, row in df.iterrows(): #,name,kana,image,dmmimage,roman
      name = row["name"]
      kana = row["kana"]
      image = row["image"]
      dmmimage = row["dmmimage"]
      #personを登録し、personIdを返す
      personId = makePerson(name)
      #personIdをもとに、そのpersonにスクレイピングした画像とDMMの画像を追加する
      addFaceToPerson(personId, dmmimage)
      addFaceToPerson(personId, image)
      sleep(20)
      se = pd.Series([name,kana,image,dmmimage,personId],["name", "kana", "image","dmmimage","personId"])
      df2 = df2.append(se,ignore_index=True)
      print (df2)

  trainGroup()

  """
  #画像から、personを特定するときのサンプルコード
  image = "https://sp.rising-pro.jp/asahi/category/attachment/artist_image"

  faceId = detectFace(image)
  person = identifyPerson(faceId["faceId"])
  print(person)
  if person["candidates"]:
    personId = person["candidates"][0]["personId"]
    print(personId)
    personName = getPersonNameByPersonId(personId)
    print(personName)
  else:
    print("No candidates found")
  """
