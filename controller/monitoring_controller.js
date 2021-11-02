require('dotenv').config()
const Monitoring = require('../models/absen_rfid')
const Pengguna = require('../models/pengguna')
const Kelas = require('../models/kelas')
const Sekolah = require('../models/dev/sekolah_dev')
const moment = require('moment')

const ObjectId = require('mongodb').ObjectId

String.prototype.trimLast = function () {
  return this.replace(/((\s*\S+)*)\s*/, "$1");
}
String.prototype.trimLast = function () {
  return this.replace(/(\s$)/, "")
}
exports.create = async function(req, res){
  console.log(req.body)
  console.log('\n\n')
    try {
      let monitoring = new Monitoring({
        mac_address: req.body.mac_address,
        rfid: req.body.rfid,
        created_at : req.body.created_at,
      })
    
     monitoring.save(function(err, result) {
        if (err) {
          
          return res.json({ success: false, data: err })    
          
        }else{
          getMonthAndModify(req.body.rfid)
          console.log("check " + req.body.rfid)
          return res.json({ success: true, data: result })    
        }
      })
      
    }catch(error){
      console.log('Error '+error )
    }
  }

  function getMonthAndModify (rf_id) {
    let dateNow = moment().utcOffset("+07:00")
    let month = dateNow.format('MMMM')
    let year = dateNow.format('YYYY')
    let day = dateNow.format('D')
    let status = "Hadir"
    let KelasArray = []
    let jamRetrun = null 
    console.log(month)

    Pengguna.findOne({ "RFID.serial_number": rf_id.trimLast() }, function (err, result) {
        let query = '{"RFID.rekap_rfid._' + year + '.' + month + '._' + day + '.Pulang": "' + new Date(Date.now()).toISOString() + '"}'
        let query2 = '{"ABSENSI._' + year + '.' + month + '._' + day + '.JAM_PULANG": "' + new Date(Date.now()).toISOString() + '"}'
       

        if (checkProperty(result, year, month, day)) {
            query = '{"RFID.rekap_rfid._' + year + '.' + month + '._' + day + '.Datang": "' + new Date(Date.now()).toISOString() + '"}'
            query2 = '{"ABSENSI._' + year + '.' + month + '._' + day + '.JAM_DATANG": "' + new Date(Date.now()).toISOString() + '"}'
        }
        
        
        // UPDATE TIME PENGGUNA
        Pengguna.update({ "RFID.serial_number": rf_id.trimLast() }, { $set: JSON.parse(query) }, function (err, res) {
            if (err) console.log(err)
            else {
                console.log('Sukses Update Pengguna')
            }
        })

        // UPDATE TIME KELAS
        try {
            Kelas.update({"NAMA_KELAS": result.Kelas[0].nama_kelas}, { $set: JSON.parse(query2) }, function (err, res) {
                if (err) console.log(err)
                else {
                    console.log('Sukses Update Pengguna Kelas')
                }
            })   
        } catch (error) {
            console.log(error + ' gagal di kelas')
        }

        // menambah absen si field sekolah 
        Pengguna.findOne({"RFID.serial_number": rf_id.trimLast()}, function (err, res) {
          if (err) console.log(err)
          else {
            if (res === null) {
              console.log("user tidak ditemukan")
            }else{
            
            let dataChecker = {
              "NAMA_SISWA": res.profil.nama_lengkap,
              "Rfid": res.RFID.serial_number,
              "Time": new Date(Date.now()).toISOString()
            }

            for (let i = 0; i < res.Kelas.length; i++) {
              if (res.Kelas[i].tahun_ajaran === "2018/2019") {
                const Kelas = res.Kelas[i];   
                KelasArray.push(Kelas)
                console.log(JSON.stringify(KelasArray[0]) + " Kelas siswa")
              }   
            }
            
            let queryUpdateStatus = JSON.parse(`{"ABSENSI._${year}.${month}.rekap_hadir": 1}`)
            let query3 = JSON.parse(`{"ABSENSI._${year}.${month}._${day}._${KelasArray[0].nama_kelas}": ${JSON.stringify(dataChecker)}}`)
            
            let query_check_pulang = JSON.parse(`{"ABSENSI._${year}.${month}._${day}._${KelasArray[0].nama_kelas}": ""}`)
            let arrayKelasPulangCheck = []

            Sekolah.findOne({"NAMA_SEKOLAH": res.sekolah}, query_check_pulang, function (err, resultCheckPulang) {
              console.log('Datas ' + JSON.stringify(resultCheckPulang.ABSENSI))
              let resultPulang = resultCheckPulang.ABSENSI[`_${year}`][`${month}`][`_${day}`][`_${KelasArray[0].nama_kelas}`]

              console.log(resultPulang)
              
              // console.log(lod.values(lod.groupBy(resultPulang)).map(d => ({nama_siswa: d[0].NAMA_SISWA, count : d.length})))
              
              for (let x = 0; x < resultPulang.length; x++) {
                const elementPulang = resultPulang[x]
                if (elementPulang.NAMA_SISWA === res.profil.nama_lengkap) {
                  arrayKelasPulangCheck.push(elementPulang)
                }
              }
              if (arrayKelasPulangCheck.length >= 1) {
                
                if (arrayKelasPulangCheck.length >= 2) {
                  console.log(res.profil.nama_lengkap + " telah melakukan absen lebih dari 2")
                }else{
                  SekolahAbstein.update({"NAMA_SEKOLAH":"SMP Assalam"}, { $inc: queryUpdateStatus})
                }
              }
            })

            Sekolah.update({ "NAMA_SEKOLAH": 'SMP Assalam' }, { $push: query3 }, function (err, res) {
              if (err) console.log(err)
              else {
                console.log('Sukses tambah absen Sekolah')
              }
              })
            }
            }  
        })
    })
}

function checkProperty(result, year, month, day) {
    try {
        if ((typeof result['RFID']['rekap_rfid']['_' + year][month]['_' + day]['Datang'] === 'undefined') || (result['RFID']['rekap_rfid']['_' + year][month]['_' + day]['Datang'] === null)) {
            return true
        } else {
            return false
        }
    }
    catch (error) {
        return true
    }
}
