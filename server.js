const fs = require("fs");
const bodyParser = require("body-parser");
const jsonServer = require("json-server");
const jwt  = require("jsonwebtoken");

const server = jsonServer.create();
const db = JSON.parse(fs.readFileSync("./db.json", "utf-8"));

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

    const access_token = createToken({email,password});
    res.status(200).json({token:access_token});
});

server.post("/api/auth/verify-email", (req, res) => {
    console.log(req.body,"body");
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

    const access_token = createToken({id,name:userName,email,password});
    res.status(200).json({
        name: userName,
        token:access_token
    });
});


server.listen(process.env.PORT || 5000,()=> {
    console.log("Runing Fake Json Server");
});