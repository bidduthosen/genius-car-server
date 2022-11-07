const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000 ;


// middleware
app.use(cors());
app.use(express.json());



app.get('/', (req, res)=>{
    res.send('genius car server running')
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.og8pjeq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifiedJWT (req, res, next){
    console.log(req.headers.authorization);
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'unauthorized'})
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'forbidden access'})
        }
        req.decoded = decoded;
        next()
    })
}

async function run(){
    try{
        const servicesCollection = client.db('geniusCar').collection('services');
        const ordersCollection = client.db('geniusCar').collection('orders');

          // jwt api------
          app.post('/jwt', (req, res)=>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '8h'});
            res.send({token});
        })

        app.get('/services', async(req, res)=>{
            const query = {};
            const cursor = servicesCollection.find(query);
            const user = await cursor.toArray();
            res.send(user);
        });

        app.get('/services/:id', async (req, res)=>{
            const id = req.params.id;
            const query ={_id : ObjectId(id)};
            const service = await servicesCollection.findOne(query);
            res.send(service);
        })

        // orders api
        
        app.get('/orders', verifiedJWT, async(req, res)=>{
            const decoded = req.decoded;
            if(decoded.email !== req.query.email){
                return res.status(403).send({message: 'unauthorized access'})
            }
            let query = {};
            if(req.query.email){
                query ={
                    email: req.query.email
                }
            };
            const cursor = ordersCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.post('/orders',  async(req, res)=>{
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.send(result)
        })

        app.delete('/orders/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id : ObjectId(id)};
            const  result = await ordersCollection.deleteOne(query); 
            res.send(result);
        })

        app.patch('/orders/:id', async(req, res)=>{
            const id = req.params.id;
            const status = req.body.status;
            const query = {_id: ObjectId(id)};
            const updateDoc = {
                $set: {
                    status: status
                }
            }
            const result = await ordersCollection.updateOne(query, updateDoc);
            res.send(result);
        })
    }
    finally{

    }
}

run().catch(err => console.log(err));


app.listen(port, ()=>{
    console.log(`genius car server running on ${port}`);
})