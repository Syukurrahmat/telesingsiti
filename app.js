const path = require('path')
const express = require('express')
const ejs = require('ejs');
const app = express()
const mysql = require('mysql');
const bodyParser = require('body-parser')
const fetch = require('node-fetch');

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database:'syukur'
  });
  
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

app.listen(4000,()=>{
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
app.get('/lahan-:id-all', function(req,res){
    
    con.query("SELECT * FROM data_lahan WHERE id=?",[req.params.id], function (err, result1, fields) {
        if (err) console.log(err);
        // console.log(result1);
        
        con.query("SELECT * FROM "+result1[0].tabelkelembaban, function (err, result2, fields) {
            if (err) console.log(err);
            // console.log(result2);

            res.render('data',{
                data:result1[0],
                kelemb:JSON.stringify(result2),
                rt:'all',
                hari:getFullTodayDate()
            })

        })

    });
})

app.get('/lahan-:id',async function (req, res) {  //today

    today = getTodayDate()
    yesterday = getYesterdayDate()

    console.log(today)
    console.log(yesterday)

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

function getTodayDate(){
    td = new Date(Date.now());
    return td.getDate()+" "+bulan[td.getMonth()]+' '+(td.getYear()+1900)
}
function getYesterdayDate(){
    yes = new Date(Date.now() - 86400000);
    return yes.getDate()+" "+bulan[yes.getMonth()] + ' ' +(yes.getYear()+1900)
}

function getFullTodayDate(){
    let bulanFull = ['Januari','Februari','Maret','April','Mei','Juni','juli','Agustus','September','Oktober','November','Desember']
    let hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

    td = new Date(Date.now());
    return hari[td.getDay()]+", "+td.getDate()+" "+bulanFull[td.getMonth()]+' '+(td.getYear()+1900)
}

setInterval(()=>{
    getdataTS(Math.floor(Math.random()*100))
},60000)

function getdataTS(data){
    dt = new Date()
    jam =  dt.getHours() +':' + dt.getMinutes() //jam sekarang
    today = getTodayDate()
   
    con.query("SELECT * FROM data_lahan", function (err, result1, fields) {
        if (err) console.log(err);
        
        result1.forEach((e)=>{
            // panggil api thingspeak

            con.query('INSERT INTO '+e.tabelkelembaban+' (date,time, data) VALUES (?,?,?)',[today,jam,data], function (err, result) {
            if (err) throw err;
            console.log("1 record inserted");
            })
        })


    })

    
}
