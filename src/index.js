// require("dotenv").config({ path: "./.env" })
import dotenv from "dotenv"
import express from "express"
import connectDB from "./db/index.js"

dotenv.config({ path: "./.env" })

const app = express()

connectDB()
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{console.log(`Server listening on port ${process.env.PORT}`);})
})


/*
(async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error)=>{
            console.log(error);
            throw error
        })
        app.listen(process.env.PORT, ()=>{
            console.log(`Server listening on port ${process.env.PORT}`);
        })
    } catch (error) {
        console.log(error)
        throw error
    }
})()
*/