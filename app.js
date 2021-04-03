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
app.get('/lahan-:id-yesterday', function(req,res){

    let yesterday = getYesterdayDate()

    con.query("SELECT * FROM data_lahan WHERE id=?",[req.params.id], function (err, result1, fields) {
        if (err) console.log(err);
        // console.log(result1);
        
        con.query("SELECT * FROM "+result1[0].tabelkelembaban +' WHERE date=?',[yesterday], function (err, result2, fields) {
            if (err) console.log(err);
            // console.log(result2);

            res.render('data',{
                data:result1[0],
                kelemb:JSON.stringify(result2),
                rt:'yesterday',
                hari:getFullTodayDate()
            })

        })

    });
})

// all data page
app.get('/lahan-:id-selumbari', function(req,res){
    let selumbari = getSelumbariDate()

    con.query("SELECT * FROM data_lahan WHERE id=?",[req.params.id], function (err, result1, fields) {
        if (err) console.log(err);
        // console.log(result1);
        
        con.query("SELECT * FROM "+result1[0].tabelkelembaban +' WHERE date=?',[selumbari], function (err, result2, fields) {
            if (err) console.log(err);
            // console.log(result2);

            res.render('data',{
                data:result1[0],
                kelemb:JSON.stringify(result2),
                rt:'yesterday',
                hari:getFullTodayDate()
            })

        })

    });
})

app.get('/lahan-:id',async function (req, res) {  //today

    today = getTodayDate()
    yesterday = getYesterdayDate()

    con.query("SELECT * FROM data_lahan WHERE id=?",[req.params.id], function (err, result1, fields) {
        if (err) console.log(err);
        // console.log(result1);
        

        con.query("SELECT * FROM "+result1[0].tabelkelembaban +' WHERE date=? OR date=?',[today,yesterday], function (err, result2, fields) {
            if (err) console.log(err);

            result2.reverse()

            let dtToday= [];
            for(i=0;i<48;i++){
                dtToday.push(result2[i])
            }

            dtToday.reverse()

            dtToday = dtToday.filter((e)=>e!=undefined)

            res.render('data',{
                data:result1[0],
                kelemb:JSON.stringify(dtToday),
                rt:'today',
                hari:getFullTodayDate(),
            })

        })

    });
})


let bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','jul','Agu','Sep','Okt','Nov','Des']
let gmt7 = 25200000

function getTodayDate(){
   
    td = new Date(Date.now()+gmt7);
    return td.getDate()+" "+bulan[td.getMonth()]+' '+(td.getYear()+1900)
}
function getYesterdayDate(){
   
    yes = new Date(Date.now() + gmt7 - 86400000);
    return yes.getDate()+" "+bulan[yes.getMonth()] + ' ' +(yes.getYear()+1900)
}
function getSelumbariDate(){
   
    sl = new Date(Date.now() + gmt7 - 172800000);
    return yes.getDate()+" "+bulan[yes.getMonth()] + ' ' +(yes.getYear()+1900)
}

function getFullTodayDate(){
   
    let bulanFull = ['Januari','Februari','Maret','April','Mei','Juni','juli','Agustus','September','Oktober','November','Desember']
    let hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

    td = new Date(Date.now() + gmt7);
    return hari[td.getDay()]+", "+td.getDate()+" "+bulanFull[td.getMonth()]+' '+(td.getYear()+1900)
}

let simulasikelembaban = 80
setInterval(()=>{
    let perubahan = Math.floor(Math.random()*4)
    if (Math.random()>0.8){
        simulasikelembaban += perubahan;
    }else{
        simulasikelembaban -= perubahan;
    }

    getdataTS(simulasikelembaban)

},1800000) 






 function getdataTS(data){
    
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
// 
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