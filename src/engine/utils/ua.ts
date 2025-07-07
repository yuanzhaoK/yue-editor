const UA = navigator.userAgent // Mozilla/5.0 (Windows NT 10.0 Win64 x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/17.17134

const EDGE = /edge/i.test(UA) // Mozilla/5.0 (Macintosh Intel Mac OS X 10_13_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36

const CHROME = !EDGE && /chrome/i.test(UA) // Mozilla/5.0 (Macintosh Intel Mac OS X 10.13 rv:62.0) Gecko/20100101 Firefox/62.0

const FIREFOX = /firefox/i.test(UA) // Mozilla/5.0 (Macintosh Intel Mac OS X 10_13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1 Safari/605.1.15

const SAFARI = !EDGE && !CHROME && /safari/i.test(UA) // Mozilla/5.0 (iPhone CPU iPhone OS 12_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/16B92 AliApp(DingTalk/4.5.18) com.laiwang.DingTalk/10640366 Channel/201200 language/zh-Hans-CN

const MOBILE = /mobile/i.test(UA) // iOS

const IOS = /os [\.\_\d]+ like mac os/i.test(UA) // Android

const ANDROID = /android/i.test(UA) // Mac OS X

const MACOS = !IOS && /mac os x/i.test(UA) // Windows

const WINDOWS = /windows\s*(?:nt)?\s*[\.\_\d]+/i.test(UA)

export {
  UA,
  EDGE,
  CHROME,
  FIREFOX,
  SAFARI,
  MOBILE,
  IOS,
  ANDROID,
  MACOS,
  WINDOWS
}