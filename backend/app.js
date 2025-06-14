import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import router from "./routes/index.js"
import { databaseConnector } from "./config/index.js"
import useragent from "express-useragent"
import errorHandler from "./errors/index.js"

const app = express()

const configureApp = async () => {

  const db = await databaseConnector()
  console.log("Database connection established:", db.name)

  app.use(cors({
    origin: process.env.NODE_ENV === 'development' ? process.env.DEV_URL : process.env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['set-cookie']
  }))

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', true)
    next()
  })
  app.use(useragent.express())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())
  app.use('/api/v1',router)
  app.use(errorHandler)

  return app
}

export { app, configureApp }