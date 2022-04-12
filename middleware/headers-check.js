import { Console as console } from '../modules/logger-mod.js';

import jwt from 'jsonwebtoken';

class ErrorDTO {
    error = '';
    msg = '';
}

const EXCLUDE_AUTH = ["/signin/", "/index.html","/time"];
const EXCLUDE_APP_KEY = [".png", ".jpg", ".html", ".js", ".ico",
    ".bmp", ".ttf", ".woff", ".json", ".txt",
    ".map", ".css", ".svg","/time"];

export default class HeadersCheck {

    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @param {*} next 
     * @returns 
     */
    static check(req, res, next) {
        let apiKey = req.headers["x-appkey-auth"] || null;
        const errorDto = new ErrorDTO();
        console.debug("appKey ", apiKey);
        const needCheckAppKey = !EXCLUDE_APP_KEY.find((t) => req.originalUrl.indexOf(t) > -1) && req.originalUrl !== '/';

        if (!apiKey && needCheckAppKey) {
            console.debug("appKey not auth ", apiKey);
            errorDto.error = "appkey is required";
            errorDto.msg = "APPKEY-REQUIRED";
            return res.status(403).send(errorDto);
        }
        else if (!needCheckAppKey) {
            apiKey = process.env.HTTP_SERVER_APP_KEY;
        }
        try {
            const apiKeyApp = process.env.HTTP_SERVER_APP_KEY;
            if (!!apiKeyApp && (!needCheckAppKey || apiKeyApp === apiKey)) {

                let needCheckToken = !EXCLUDE_AUTH.find((t) => req.originalUrl.indexOf(t) > -1);
                EXCLUDE_APP_KEY.forEach((t) => {
                    try {
                        const ext = req.originalUrl.substring(req.originalUrl.lastIndexOf('.') + 1);
                        if (ext && t.indexOf(ext) > -1) {
                            return needCheckToken = false;
                        }
                    } catch (err) {
                        //console.error(err);
                    }
                });
                if (needCheckToken && req.originalUrl !== '/') {
                    const apiToken = req.headers["x-app-auth"] || null;

                    if (!!apiToken) {
                        try {
                            const payload = jwt.verify(apiToken, process.env.HTTP_SERVER_TOKEN_SECRET);

                            if (!!payload) {
                                const dateNow = new Date().getTime();
                                const exp = Math.abs((payload.exp - dateNow) / 1000) <= Number(process.env.HTTP_SERVER_TOKEN_EXPIRE);

                                if (exp) {
                                    req.authUser = payload.chatId;
                                    return next();
                                }
                                else {
                                    errorDto.error = "Session expired";
                                    errorDto.msg = "USER-SESSION-EXPIRED";
                                    return res.status(401).send(errorDto);
                                }
                            }
                            else {
                                errorDto.error = "Access denied";
                                errorDto.msg = "USER-NOT-FOUND";
                                return res.status(401).send(errorDto);
                            }
                        }
                        catch (err) {
                            errorDto.error = "Access denied";
                            errorDto.msg = "USER-NOT-FOUND";
                            return res.status(401).send(errorDto);
                        }
                    }
                    else {
                        errorDto.error = "Access denied";
                        errorDto.msg = "AUTH-NOT-VALID";
                        return res.status(401).send(errorDto);
                    }
                }
                return next();
            }
            else {
                errorDto.error = "appkey is not valid";
                errorDto.msg = "APPKEY-NOT-VALID";
                return res.status(401).send(errorDto);
            }
        } catch (err) {
            errorDto.error = "appkey is not valid";
            errorDto.msg = "APPKEY-NOT-VALID";
            return res.status(401).send(errorDto);
        }
    }
}
