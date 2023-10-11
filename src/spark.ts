/*
 * @Author: chenzhongsheng
 * @Date: 2023-06-11 08:53:35
 * @Description: Coding something
 */
import { hmac, utf8, base64 } from "./utils";
import { IQuestionOptions, ISparkSocketBaseOptions, SparkChat } from "./chat";
import { Socket } from "./node-socket";

export interface ISparkOptions extends ISparkSocketBaseOptions {
  secret: string;
  key: string;
  version: string;
}

export class Spark {
  secret: string;
  key: string;
  version: string;

  spartChat: SparkChat;

  constructor({
    secret,
    key,
    appid,
    uid,
    temperature,
    maxTokens,
    topK,
    chatId,
    useHistory,
    version = 'v2'
  }: ISparkOptions) {
    if (!key || !secret) throw new Error("Invalid Key Or Secret");
    this.secret = secret;
    this.key = key;
    this.version = version;

    // @ts-ignore
    SparkChat.Socket = Socket;

    if (appid) {
      this.spartChat = new SparkChat({
        appid,
        uid,
        temperature,
        maxTokens,
        topK,
        chatId,
        useHistory,
        urlGetter: () => Promise.resolve(this.generateUrl()),
      });
    }
  }

  /**
   * 生成带签名的ws连接字符串
   * 
   * @returns 
   */
  generateUrl() {
    const data = this._generateAuth() as any;
    const arr = [];

    for (const k in data) {
      arr.push(`${k}=${data[k]}`);
    }

    return `wss://spark-api.xf-yun.com/${this.version}.1/chat?${arr.join("&")}`;
  }

  chat(data: IQuestionOptions) {
    return this.spartChat.chat(data, this.version);
  }

  private _generateAuth() {
    const host = "spark-api.xf-yun.com";
    const date = new Date().toUTCString(); // 'Sun, 11 Jun 2023 01:31:08 GMT'; //
    return {
      host,
      date,
      authorization: this._authorize(host, date),
    };
  }

  /**
   * 生成签名
   * 
   * @param host 
   * @param date 
   * @returns 
   */
  private _authorize(host: string, date: string) {
    const APISecret = this.secret;
    const APIKey = this.key;
    const tmp = `host: ${host}\ndate: ${date}\nGET /${this.version}.1/chat HTTP/1.1`;
    const sign = hmac(utf8(APISecret), utf8(tmp));
    // console.log(sign);
    const authorizationOrigin = `api_key="${APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${sign}"`;
    // console.log(authorizationOrigin);
    return base64(utf8(authorizationOrigin));
  }
}
