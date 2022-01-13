const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt  = require("jsonwebtoken");
const dotenv  = require("dotenv");
const { OAuth2Client } = require('google-auth-library');

dotenv.config();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const server = jsonServer.create();
const db = JSON.parse(fs.readFileSync("./dbs.json", "utf-8"));

server.use(bodyParser.urlencoded({extended: true}));
server.use(bodyParser.json());
server.use(jsonServer.defaults());

const SECERT_KEY = "FEGFRYG47Y74RY478Y88U";
const expiresIn  = "1h";

function createToken(payload){
    return jwt.sign(payload, SECERT_KEY, {expiresIn});
}

function isAuthenticated({email,password}){
    return (
        db.users.findIndex(
            (user) => user.email === email && user.password === password
        ) !== -1 
    );
}

function verifyEmail(email){
    return (
        db.users.findIndex(
            (user) => user.email === email
        ) !== -1 
    );
}


server.post("/api/auth/register", (req, res) => {
    const {fullname,email, password} = req.body;
    if(isAuthenticated({email,password})){
        const status = 401;
        const message = "Email already exist";
        res.status(status).json({status, message})
        return;
    }

    fs.readFile("./db.json", (err,data)=>{
        if(err){
            const status = 401;
            const message = err;
            res.status(status).json({status, message})
            return;
        }
        data = JSON.parse(data.toString());
        let last_item_id = data.users[data.users.length -1].id
        data.users.push({id: last_item_id + 1,fullname:fullname, email: email, password: password});
        let writeData = fs.writeFile("./db.json", 
            JSON.stringify(data),
            (err, result) => {
                if(err){
                    const status = 401;
                    const message = err;
                    res.status(status).json({status, message})
                    return;
                }
            }
        )
    });

    const access_token = createToken({email});
    res.status(200).json({token:access_token});
});

server.post("/api/auth/verify-email", (req, res) => {
    const emailCode = req.body;
    if(!emailCode){
        const status = 401;
        const message = "Wrong verification code";
        res.status(status).json({status, message})
        return;
    }
    res.status(200).json({
        success: true,
    });
});

server.post("/api/auth/login", (req, res) => {
    const {email, password} = req.body;
    if(!isAuthenticated({email,password})){
        const status = 401;
        const message = "Incorrect Email or Password";
        res.status(status).json({status, message})
        return;
    }
    const userData = db.users.find((user) => user.email === email && user.password === password)
    const id = userData.id;
    const userName = userData.fullname;

    const access_token = createToken({id,name:userName,email});
    res.status(201).json({
        name: userName,
        token:access_token
    });
});

server.post("/api/auth/google-login", async (req, res) => {
    const {tokenId} = req.body;
    const ticket = await client.verifyIdToken({
        idToken: tokenId,
        audience: process.env.GOOGLE_CLIENT_ID
    });

    const { name, email} = ticket.getPayload();
    console.log(name,email,'name')

    if(!email){
        const status = 401;
        const message = "Email is not valid";
        res.status(status).json({status, message})
        return;
    }

 
    const userData = db.users.find((user) => user.email === email);
    if(userData){
        const id = userData.id;
        const usermail = userData.email;

        const access_token = createToken({id,name,usermail});
        res.status(201).json({
            name: name,
            token:access_token
        });

        return;
        
    }else{
        fs.readFile("./db.json", (err,data)=>{
            if(err){
                const status = 401;
                const message = err;
                res.status(status).json({status, message})
                return;
            }
            data = JSON.parse(data.toString());
            let get_item = data.users[data.users.length -1].id
            data.users.push({id: last_item_id + 1,fullname:name, email: email, password: null});
            let writeData = fs.writeFile("./db.json", 
                JSON.stringify(data),
                (err, result) => {
                    console.log(result,'re')
                    if(err){
                        const status = 401;
                        const message = err;
                        res.status(status).json({status, message})
                        return;
                    }
                }
            )
        });
        
        console.log(writeData,'writeData')
        const access_token = createToken({name,email});
        res.status(201).json(
            {
                name: name,
                token:access_token
           });

        return;
    }

    
});

server.post("/api/auth/forgotpassord", (req, res) => {
    console.log(req.body,'body')
    const {email} = req.body;
    if(!verifyEmail(email)){
        const status = 401;
        const message = "Email is not registered";
        res.status(status).json({status, message})
        return;
    }
    res.status(200).json({
        success: true,
    });
});

server.post("/api/auth/newpassword", (req, res) => {
    console.log(req.body,'body')
    const {email,password} = req.body;
    if(!verifyEmail(email)){
        const status = 401;
        const message = "Email is not registered";
        res.status(status).json({status, message})
        return;
    }

    fs.readFile("./db.json", (err,data)=>{
        if(err){
            const status = 401;
            const message = err;
            res.status(status).json({status, message})
            return;
        }
     
        data = JSON.parse(data.toString());
        let elementIndex = data.users.findIndex(user => user.email === email);
        let newArray = [...data.users];
        newArray[elementIndex] = {...newArray[elementIndex], password:password}
        data.users = newArray;
        let writeData = fs.writeFile("./db.json", 
            JSON.stringify(data),
            (err, result) => {
                if(err){
                    const status = 401;
                    const message = err;
                    res.status(status).json({status, message})
                    return;
                }
            }
        )
     });
    res.status(200).json({
        success: true,
    });
});


server.listen(process.env.PORT || 5000,()=> {
    console.log("Running Fake Json Server");
});