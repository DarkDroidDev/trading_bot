import jwt_decode from "jwt-decode";

const baseUrl = process.env.REACT_APP_API_BASEURL;
const tokenHeader = process.env.REACT_APP_API_TOKEN_HEADER;


const headers = new Headers();
headers.append(process.env.REACT_APP_API_APP_KEY_HEADER, process.env.REACT_APP_API_APP_KEY_VALUE);

const fetchOptions = {
    credentials: 'include',
    redirect: 'follow',
    headers: headers
}

/**
 * Ottiene tutti i display Types
 * @returns 
 */
export const timestampCall = async () => {
    try {
        //debugger;
        const controller = `${baseUrl}/time`;

        const result = await fetch(controller, {
            method: "get",
            ...fetchOptions
        });
        if (result && result.text) {
            const data = await result.text();
            return !!data ? JSON.parse(data) : null;
        }

        return null;
    }
    catch (e) {
        console.log(e);
    }

    return null;
}

/**
 * Esegue authenticazione con token
 * 
 * @param {string} code 
 * @returns 
 */
export const singnWithToken = async (code) => {
    try {
        //debugger;
        const controller = `${baseUrl}/signin/token/${code}`;

        const result = await fetch(controller, {
            method: "post",
            ...fetchOptions
        });
        if (result && result.text) {
            const data = await result.text();
            return !!data ? JSON.parse(data) : null;
        }

        return null;
    }
    catch (e) {
        console.log(e);
    }

    return null;
}

export const listSettings = async () => {


    try {
        //debugger;
        const controller = `${baseUrl}/settings/list`;
        const headersList = new Headers();

        const token = localStorage.getItem('token-data');

        if (!token) {
            return;
        }

        headersList.append(process.env.REACT_APP_API_APP_KEY_HEADER, process.env.REACT_APP_API_APP_KEY_VALUE);
        headersList.append(tokenHeader, token);

        const fetchOptionslist = {
            credentials: 'include',
            redirect: 'follow',
            headers: headersList
        }

        const result = await fetch(controller, {
            method: "get",
            ...fetchOptionslist
        });
        if (result && result.text) {
            const data = await result.text();
            return !!data ? JSON.parse(data) : null;
        }

        return null;
    }
    catch (e) {
        console.log(e);
    }

    return null;
}

export const listSymbols = async (chatId) => {


    try {
        const token = localStorage.getItem('token-data');
        if (!chatId) {
            chatId = getChatIdFromToken();
        }
        const controller = `${baseUrl}/symbols/${chatId}`;
        const headersList = new Headers();

        if (!token) {
            return 'NO-AUTH';
        }

        headersList.append(process.env.REACT_APP_API_APP_KEY_HEADER, process.env.REACT_APP_API_APP_KEY_VALUE);
        headersList.append(tokenHeader, token);

        const fetchOptionslist = {
            credentials: 'include',
            redirect: 'follow',
            headers: headersList
        }

        const result = await fetch(controller, {
            method: "get",
            ...fetchOptionslist
        });
        if (result && result.text) {
            const data = await result.text();
            return !!data ? JSON.parse(data) : null;
        }

        return null;
    }
    catch (e) {
        console.log(e);
    }

    return null;
}

export const accountData = async (chatId) => {


    try {
        const token = localStorage.getItem('token-data');
        if (!chatId) {
            chatId = getChatIdFromToken();
        }
        const controller = `${baseUrl}/account/${chatId}`;
        const headersList = new Headers();

        if (!token) {
            return 'NO-AUTH';
        }

        headersList.append(process.env.REACT_APP_API_APP_KEY_HEADER, process.env.REACT_APP_API_APP_KEY_VALUE);
        headersList.append(tokenHeader, token);

        const fetchOptionslist = {
            credentials: 'include',
            redirect: 'follow',
            headers: headersList
        }

        const result = await fetch(controller, {
            method: "get",
            ...fetchOptionslist
        });
        if (result && result.text) {
            const data = await result.text();
            return !!data ? JSON.parse(data) : null;
        }

        return null;
    }
    catch (e) {
        console.log(e);
    }

    return null;
}

export const accountSaveData = async (data,chatId) => {


    try {
        const token = localStorage.getItem('token-data');
        if (!chatId) {
            chatId = getChatIdFromToken();
        }
        const controller = `${baseUrl}/account/${chatId}`;
        const headersList = new Headers();

        if (!token) {
            return 'NO-AUTH';
        }

        headersList.append(process.env.REACT_APP_API_APP_KEY_HEADER, process.env.REACT_APP_API_APP_KEY_VALUE);
        headersList.append(tokenHeader, token);
        headersList.append("Content-Type", "application/json");

        const fetchOptionslist = {
            credentials: 'include',
            redirect: 'follow',
            headers: headersList
        }

        const result = await fetch(controller, {
            method: "POST",
            ...fetchOptionslist,
            body: JSON.stringify(data)
        });
        if (result && result.text) {
            const data = await result.text();
            return !!data ? JSON.parse(data) : null;
        }

        return null;
    }
    catch (e) {
        console.log(e);
    }

    return null;
}

export const getChatIdFromToken = () => {
    const token = localStorage.getItem('token-data');
    let chatId;
    if (token) {
        const tokenDecoded = jwt_decode(token);
        if (tokenDecoded && tokenDecoded.chatId) {
            chatId = tokenDecoded.chatId;
        }
    }
    return chatId;
}

export const editSettings = async (settings,restartStrategy) => {


    try {
        const token = localStorage.getItem('token-data');
        if (!token) {
            return;
        }

        if(!restartStrategy){
            restartStrategy=false;
        }

        const controller = `${baseUrl}/settings/edit/${restartStrategy}`;
        const headersList = new Headers();

        if (!token) {
            return 'NO-AUTH';
        }

        headersList.append(process.env.REACT_APP_API_APP_KEY_HEADER, process.env.REACT_APP_API_APP_KEY_VALUE);
        headersList.append(tokenHeader, token);
        headersList.append("Content-Type", "application/json");

        const fetchOptionslist = {
            credentials: 'include',
            redirect: 'follow',
            headers: headersList
        }

        const result = await fetch(controller, {
            method: "POST",
            ...fetchOptionslist,
            body: JSON.stringify(settings)
        });
        if (result && result.text) {
            const data = await result.text();
            return !!data ? JSON.parse(data) : null;
        }

        return null;
    }
    catch (e) {
        console.log(e);
    }

    return null;
}

export const restartServer = async (chatId) => {


    try {
        const token = localStorage.getItem('token-data');
        if (!chatId) {
            chatId = getChatIdFromToken();
        }
        const controller = `${baseUrl}/server/restart/${chatId}`;
        const headersList = new Headers();

        if (!token) {
            return 'NO-AUTH';
        }

        headersList.append(process.env.REACT_APP_API_APP_KEY_HEADER, process.env.REACT_APP_API_APP_KEY_VALUE);
        headersList.append(tokenHeader, token);
        headersList.append("Content-Type", "application/json");

        const fetchOptionslist = {
            credentials: 'include',
            redirect: 'follow',
            headers: headersList
        }

        const result = await fetch(controller, {
            method: "POST",
            ...fetchOptionslist
        });
        if (result && result.text) {
            const data = await result.text();
            return !!data ? JSON.parse(data) : null;
        }

        return null;
    }
    catch (e) {
        console.log(e);
    }

    return null;
}
