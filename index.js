const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const concat = require('concat-stream');
const Papa = require('papaparse');

require('dotenv').config();

const root_folder = __dirname;
const data_folder = path.join(root_folder, 'data');


let pois = require('./pois.json');
pois = pois.features.map(row => {
    let { osm_id: id, name = '', other_tags = '' } = row.properties;
    let [lng, lat] = row.geometry.coordinates;
    let tags = other_tags.replace(/\"/igm,'').replace(/\=\>/igm, ':');
    return {
        id,
        name,
        tags,
        lat,
        lng
    };
});

let pois_csv = Papa.unparse(pois);


const api = axios.create({
    baseURL: process.env.CMS_ENDPOINT,
    params: {
        key: process.env.CMS_KEY
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity
});


const uploadFile = async (file) => {
    let fd = new FormData();
    fd.append('file', fs.createReadStream(`${data_folder}/${file}`));

    await fd.pipe(concat(async data => {
        await api.post('upload', data, {
            headers: {
                ...fd.getHeaders()
            }
        })
            .then((resp) => { 
                console.log(`${file} uploaded`) 
                console.log(resp.data);
            })
            .catch((error) => {
                if (error.response) {
                    //fs.writeFile(`${root_folder}/teste/out-${Date.now()}.html`, error.response.data, function () { });
                    console.log(error.response.data);
                } else if (error.request) {
                    console.error(error.request);
                } else {
                    console.error(error.message);
                }
                console.error(`${file} not uploaded ${error.message}`)
            });
    }));
};


const uploadFiles = () => {
    return fs.promises.readdir(data_folder)
        .then(async files => {
            for (let file of files) {
                await uploadFile(file);
            }
        });
};

(async () => {

    await fs.promises.writeFile(path.join(data_folder, 'pois.csv'), pois_csv);
    await uploadFiles();
//    await uploadFile('sul.poi.json');
})();