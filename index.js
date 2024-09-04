const axios = require('axios');
const Mailjs = require("@cemalgnlts/mailjs");
const fs = require('fs');
const mailjs = new Mailjs();
const TelegramBot = require('node-telegram-bot-api');
const keep_alive = require('./keep_alive.js');

const token = '7528519613:AAEgQYdI1O6l8ccp6mPXciXKdvH5u97G6j4';
const bot = new TelegramBot(token, { polling: true });
let accountList = [];

let chatIds = [];
async function sendTelegramMessage(message) {
    for (const id of chatIds) {
        try {
            await bot.sendMessage(id, message);
        } catch (error) {
            console.error(`Lỗi gửi tin nhắn đến Telegram (chatId: ${id}):`, error);
        }
    }
}

async function randomPhoneNumber() {
    const prefixes = ['090', '091', '092', '093', '094', '095', '096', '097', '098', '099'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 1000000).toString().padStart(7, '0');
    return `${prefix}${number}`;
}

async function generateRandomString() {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'thuhien';
    let usedCharacters = new Set();

    while (usedCharacters.size < 4) {
        let char = characters.charAt(Math.floor(Math.random() * characters.length));
        if (!usedCharacters.has(char)) {
            usedCharacters.add(char);
            result += char;
        }
    }

    return result;
}

async function randomEmail() {
    try {
        const domainsResponse = await mailjs.getDomains();
        const domains = domainsResponse.data;
        if (!Array.isArray(domains) || domains.length === 0) {
            throw new Error('No domains available or data format is incorrect');
        }

        const randomDomain = domains[Math.floor(Math.random() * domains.length)].domain;
        if (!randomDomain) {
            throw new Error('Unable to find a valid domain');
        }
        const randomAddress = await generateRandomString();
        const emailAddress = `${randomAddress}@${randomDomain}`;

        const password = `Thuhien123`;
        const accountResponse = await mailjs.register(emailAddress, password);
        const account = accountResponse.data;
        return {
            address: account.address,
            password: password
        };
    } catch (error) {
        console.error('Error creating random email:', error.message);
        throw error;
    }
}

async function randomName() {
    const firstNames = ['Tuan', 'Anh', 'Binh', 'Chau', 'Dung', 'Hanh', 'Hieu', 'Hoa', 'Khoa', 'Linh', 'Minh', 'Nam', 'Ngoc', 'Phuong', 'Quang', 'Son', 'Tuan', 'Trang', 'Vinh'];
    const lastNames = ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Phan', 'Vu', 'Vo', 'Dang', 'Bui', 'Do', 'Ho', 'Ngo', 'Duong', 'Ly'];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return {firstName, lastName};
}

async function signUp(phone, email, firstName, lastName) {
    const url = "https://mcdelivery.vn/vn/sso/register.json";
    const headers = {
        'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        'sec-ch-ua-mobile': '?0',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'csrfValue': '9b0b0f8bfe1ea40a6d08cdf3c39b23ee',
        'X-Requested-With': 'XMLHttpRequest',
        'sec-ch-ua-platform': "Windows",
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Dest': 'empty',
        'host': 'mcdelivery.vn'
    };
    const data = {
        "email": email,
        "password": "Thuhien123",
        "firstName": firstName,
        "lastName": lastName,
        "contactNo": phone,
        "subscribeMailList": "true",
        "_subscribeMailList": "on",
        "subscribeTxtMsg": "true",
        "_subscribeTxtMsg": "on",
        "subscribeLoyalty": "true",
        "_subscribeLoyalty": "on",
        "agreeTandC": "true",
        "_agreeTandC": "on",
        "csrfValue": "9b0b0f8bfe1ea40a6d08cdf3c39b23ee"
    }

    const response = axios.post(url, data, {headers: headers});
    return (await response).data;
}

async function loginAndGetMessages(address, password, retries = 3) {
    if (retries < 0) {
        return null;
    }
    if (retries < 3) {
        await new Promise(resolve => setTimeout(resolve, 10000));
    }
    try {
        const resultMail = await mailjs.login(address, password);
        if (resultMail.status) {
            const response = await mailjs.getMessages();
            const dataMail = response.data;
            if (Array.isArray(dataMail) && dataMail.length === 0) {
                return await loginAndGetMessages(address, password, retries - 1);
            } else {
                const idMessages = dataMail[0].id;
                const messages = await mailjs.getMessage(idMessages);
                if (messages && messages.data && messages.data.intro) {
                    const intro = messages.data.intro;
                    const match = intro.match(/\d+/);
                    const code = match[0];
                    return code
                }
            }

        }
    } catch (error) {
        console.error('Đăng nhập không thành công');
        return loginAndGetMessages(address, password, retries - 1);
    }

}

async function mcDeliveryFa(mfaToken, otp) {
    const data = new URLSearchParams();
    data.append('mfaToken', mfaToken);
    data.append('otp', otp);
    try {
        const response = await axios.post('https://mcdelivery.vn/vn/sso/login/mfa.json', data.toString(), {
            headers: {
                'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                'sec-ch-ua-mobile': '?0',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': '*/*',
                'csrfValue': '9b0b0f8bfe1ea40a6d08cdf3c39b23ee',
                'X-Requested-With': 'XMLHttpRequest',
                'sec-ch-ua-platform': '"Windows"',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Dest': 'empty',
                'host': 'mcdelivery.vn'
            }
        });
        return response.data
    } catch (error) {
        console.error('Error:', error);
    }

}

async function main() {
    try {
        const {address, password} = await randomEmail();
        const phone = await randomPhoneNumber();
        const {firstName, lastName} = await randomName();
        const result = await signUp(phone, address, firstName, lastName);
        if (result) {
            const mfaToken = result.mfaToken;
            const otp = await loginAndGetMessages(address, password);
            if (mfaToken && otp) {
                const resultRef = await mcDeliveryFa(mfaToken, otp);
                if (resultRef.message === 'success') {
                    const account = `${address} ${password}`;
                    console.log(account)
                    accountList.push(account);
                }
            }

        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

async function executeMains(n) {
    const promises = [];
    for (let i = 0; i < n; i++) {
        promises.push(main());
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    await Promise.all(promises);
}


bot.on('message', async (msg) => {
    const messageChatId = msg.chat.id;
    const text = msg.text;
    const username = msg.from.username ? msg.from.username : "Không có tên người dùng";  // Default if username is undefined
    const firstName = msg.from.first_name ? msg.from.first_name : "Không có tên";  // Default if first name is undefined
    const lastName = msg.from.last_name ? msg.from.last_name : "";  // Default if last name is undefined

    console.log(messageChatId);
    if (!chatIds.includes(messageChatId)) {
        chatIds.push(messageChatId);
    }

    const param = parseInt(text.trim());
    if (!isNaN(param) && param > 0) {
        await executeMains(param);

        if (accountList.length > 0) {
            await sendTelegramMessage(`${firstName} ${lastName} (${username}) - Danh sách tài khoản McDonald:\n` + accountList.join('\n'));  // Include first name, last name, and username in the message
            accountList = [];
        } else {
            await sendTelegramMessage('Không có tài khoản nào.');
        }
    } else {
        await sendTelegramMessage('Vui lòng gửi một số nguyên dương.');
    }
});

