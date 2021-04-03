const path = require('path')
const express = require('express')
const ejs = require('ejs');
const app = express()
const mysql = require('mysql');
const bodyParser = require('body-parser')
const fetch = require('node-fetch');


let con = mysql.createConnection({
    host: "us-cdbr-east-03.cleardb.com",
    user: "bfbcfecc62cffc",
    password: "5773ae13",
    database:'heroku_87bfba42d7118f1'
  });
  
// con.connect(function(err) {
//     if (err) throw err;
//     console.log("Connected!");
// });

// con.end();

function handleDisconnect() {
    con.on('error', function(err) {
      if (!err.fatal) {
        return;
      }
  
      if (err.code !== 'PROTOCOL_CONNECTION_LOST') {
        throw err;
      }
  
      console.log('Re-connecting lost connection');
  
       con = mysql.createConnection({
        host: "us-cdbr-east-03.cleardb.com",
        user: "bfbcfecc62cffc",
        password: "5773ae13",
        database:'heroku_87bfba42d7118f1'
      });


      handleDisconnect();
      con.connect();
    });
  }
  
  handleDisconnect();


const port = process.env.PORT || 4000

app.listen(port,()=>{
    console.log('server connected')
})

//views template
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')
app.use(express.static( "views" ) )
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))


// ROOT
app.get('/',async function (req, res) {
    con.query("SELECT * FROM data_lahan", function (err, result, fields) {
        if (err) console.log(err);
        res.render('index.ejs',{data:result})
    })
})

// yesterday page

// all data page
app.get('/lahan-:id=:kon:date', function(req,res){
    console.log('terakses yes selum')
       con.query("SELECT * FROM data_lahan WHERE id=?",[req.params.id], function (err, result1, fields) {
        if (err) console.log(err);
        // console.log(result1);
        
        // SELECT * FROM Customers WHERE CustomerName LIKE 'a__%';

        con.query("SELECT * FROM "+result1[0].tabelkelembaban +' order by `key` desc limit 1', function (err, result2, fields) {
            if (err) console.log(err);
        
            let lastupdate = result2[0].time +' - '+result2[0].date

            let yskey = new Date(Date.parse(result2[0].key)+86400000).toISOString().split('T')[0]
            let slkey = new Date(Date.parse(result2[0].key)+172800000).toISOString().split('T')[0]

            // console.log(lastupdate)
            // console.log(yskey)
            // console.log(slkey)

            con.query("SELECT * FROM "+result1[0].tabelkelembaban +" WHERE `key` LIKE '"+ req.params.date+"%'" , function (err, result3, fields) {
                if (err) console.log(err);
                console.log(result3);
    
    
                res.render('data',{
                    data:result1[0],
                    kelemb:JSON.stringify(result3),
                    rt:(req.params.kon=='yes')? 'yesterday':'selumbari',
                    lastupdate:lastupdate,
                    nav:{
                        yesterday:yskey,
                        selumbari:slkey,
                    }
                })
    
                // res.end()
    
            })
        
        })

    });
})

app.get('/lahan-:id',async function (req, res) {  //today


    con.query("SELECT * FROM data_lahan WHERE id=?",[req.params.id], function (err, result1, fields) {
        if (err) console.log(err);

        // console.log(result1);
        
    // select column_name from table_name order by id desc limit 5
        con.query("SELECT * FROM "+result1[0].tabelkelembaban +' order by `key` desc limit 48', function (err, result2, fields) {
            if (err) console.log(err);

            let lastupdate = result2[0].time +' - '+result2[0].date

            let yskey = new Date(Date.parse(result2[0].key)+86400000).toISOString().split('T')[0]
            let slkey = new Date(Date.parse(result2[0].key)+172800000).toISOString().split('T')[0]

            console.log(yskey)
            console.log(slkey)




            let data = result2.reverse()
            // console.log(data)

            console.log(lastupdate)

            res.render('data',{
                data:result1[0],
                kelemb:JSON.stringify(data),
                rt:'today',
                lastupdate:lastupdate,
                nav:{
                    yesterday:yskey,
                    selumbari:slkey,
                }
            })


        })

    });
})


let bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','jul','Agu','Sep','Okt','Nov','Des']
let gmt7 = 25200000


setInterval(()=>{

    getdataTS()

},1200000) //20 menit


getdataTS()



 function getdataTS(){
    
    con.query("SELECT * FROM data_lahan", function (err, result1, fields) {
        if (err) console.log(err);
        
        result1.forEach(async function(e){
            // panggil api thingspeak
            let url = `https://api.thingspeak.com/channels/1347121/feeds.json?api_key=${e.apikey}&results=1`
            
            let data = await apiTS(url)
            

            con.query('INSERT INTO '+e.tabelkelembaban+' (`key`,`date`,`time`, `data`) VALUES (?,?,?,?)',[data.key , data.date , data.time , data.data], function (err, result) {
                try{
                    if (err.code == 'ER_DUP_ENTRY') {
                        console.log("thingspeak tidak update");   
                    }
                }
                catch(e){
                    console.log('data berhasil terupdate')

                }

            })

        })

    })
}

    

// apiTS()
function apiTS(url){
    ft = fetch(url).then(res=>res.json())
        .then(res=>{
            let data = res.feeds[0]                        
            let datekey = new Date(Date.parse(data.created_at)+gmt7).toISOString()
            
            let jam = datekey.split('T')[1].split('.')[0].split(':')
            jam = jam[0]+':'+jam[1]

            let date = datekey.split('T')[0] .split('-')
            date = date[2]+' '+bulan[parseInt(date[1])-1] +' '+date[0]
            
            let dtkelemb = data.field1.split('r')[0]

            return{
                'key':datekey,
                "date":date,
                "time":jam,
                "data":dtkelemb
            }
        })
    return ft;
}