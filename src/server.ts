import restify from 'restify';
import morgan from 'morgan';
import bunyan from 'bunyan';
import { spawn } from 'child_process';

const server = restify.createServer({
    name: process.env.APP_NAME,
    log: bunyan.createLogger({
        name: 'audit',
        level: 'error'
    })
});

server.use(morgan('dev'));

const interactuandoConelOs = (fileName: string) => new Promise((resolve, reject) => {
    const { spawn } = require('node:child_process');
    const touch = spawn('touch', [fileName]);

    touch.stdout.on('data', (data: Buffer) => {
        console.log(`stdout: ${data}`);
    });

    touch.stderr.on('data', (data: Buffer) => {
        console.error(`stderr: ${data}`);
    });

    touch.on('close', (code: number) => {
        console.log(`child process exited with code ${code}`);
        resolve(`Resolution code ->>>>${code}`);
    });
});

server.get('/hello/:name', async (req, res) => {
    try {
        const response = await interactuandoConelOs(req?.params?.name);
        return res.json({
            message: 'hola',
            name: req?.params?.name,
            codeMessage: response
        });
    } catch (error) {
        return res.json({
            message: (error as Error).message,
            error: true
        });
    }
});


server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

server.post('/api/v1/transform/webmtomp4', (req, res, next) => {
    // Verificar si se envió un archivo WebM en la solicitud
    if (!req.files || !req.files.webm) {
        res.status(400);
        res.json({ message: 'Se requiere un archivo WebM en la solicitud' });
        return next();
    }

    const webmFile = req.files.webm;

    // Nombre del archivo de salida MP4
    const mp4FileName = `${webmFile.name}.mp4`;

    // Comando FFmpeg para convertir el archivo WebM a MP4
    const ffmpegCommand = spawn('ffmpeg', [
        '-i',
        webmFile.path,
        '-c:v',
        'copy',
        mp4FileName,
    ]);

    ffmpegCommand.on('error', (err) => {
        console.error('Error ejecutando FFmpeg:', err);
        res.status(500);
        res.json({ message: 'Error al ejecutar FFmpeg' });
        return next();
    });

    ffmpegCommand.on('exit', (code) => {
        if (code === 0) {
            // Éxito en la conversión
            res.json({ message: 'Archivo convertido exitosamente', mp4FileName });
        } else {
            console.error('FFmpeg salió con un código de error:', code);
            res.status(500);
            res.json({ message: 'Error al convertir el archivo' });
        }
        return next();
    });
});

//curl -X POST -F "webm=@C:\Users\PAOLA\Downloads\pruebawebm.webm" http://localhost:8080/api/v1/transform/webmtomp4



server.post('/api/v1/transform/mp4towebm', (req, res, next) => {
    // Verificar si se envió un archivo MP4 en la solicitud
    if (!req.files || !req.files.mp4) {
        res.status(400);
        res.json({ message: 'Se requiere un archivo MP4 en la solicitud' });
        return next();
    }

    const mp4File = req.files.mp4;

    // Nombre del archivo de salida WebM
    const webmFileName = `${mp4File.name}.webm`;

    // Comando FFmpeg para convertir el archivo MP4 a WebM
    const ffmpegCommand = spawn('ffmpeg', [
        '-i',
        mp4File.path,
        '-c:v',
        'libvpx',
        '-b:v',
        '1M',
        '-c:a',
        'libvorbis',
        webmFileName,
    ]);

    ffmpegCommand.on('error', (err) => {
        console.error('Error ejecutando FFmpeg:', err);
        res.status(500);
        res.json({ message: 'Error al ejecutar FFmpeg' });
        return next();
    });

    ffmpegCommand.on('exit', (code) => {
        if (code === 0) {
            // Éxito en la conversión
            res.json({ message: 'Archivo convertido exitosamente', webmFileName });
        } else {
            console.error('FFmpeg salió con un código de error:', code);
            res.status(500);
            res.json({ message: 'Error al convertir el archivo' });
        }
        return next();
    });
});
//curl -X POST -F "mp4=@C:\Users\PAOLA\Downloads\pruebamp4.mp4" http://localhost:8080/api/v1/transform/mp4towebm


server.post('/api/v1/transform/mutevideos', (req, res, next) => {
    // Verificar si se enviaron dos archivos de video en la solicitud
    if (!req.files || !req.files.video1 || !req.files.video2) {
        res.status(400);
        res.json({ message: 'Se requieren dos archivos de video en la solicitud' });
        return next();
    }

    const video1File = req.files.video1;
    const video2File = req.files.video2;

    // Nombre del archivo de salida para los dos videos sin audio
    const video1WithoutAudioName = `${video1File.name}_noaudio.mp4`;
    const video2WithoutAudioName = `${video2File.name}_noaudio.mp4`;

    // Comando FFmpeg para eliminar el audio del video 1
    const ffmpegCommand1 = spawn('ffmpeg', [
        '-i',
        video1File.path,
        '-c',
        'copy',
        '-an',
        video1WithoutAudioName,
    ]);

    ffmpegCommand1.on('error', (err) => {
        console.error('Error ejecutando FFmpeg para el video 1:', err);
        res.status(500);
        res.json({ message: 'Error al eliminar el audio del video 1' });
        return next();
    });

    ffmpegCommand1.on('exit', (code) => {
        if (code === 0) {
            // Éxito al eliminar el audio del video 1, ahora eliminar el audio del video 2
            const ffmpegCommand2 = spawn('ffmpeg', [
                '-i',
                video2File.path,
                '-c',
                'copy',
                '-an',
                video2WithoutAudioName,
            ]);

            ffmpegCommand2.on('error', (err) => {
                console.error('Error ejecutando FFmpeg para el video 2:', err);
                res.status(500);
                res.json({ message: 'Error al eliminar el audio del video 2' });
                return next();
            });

            ffmpegCommand2.on('exit', (code) => {
                if (code === 0) {
                    // Éxito al eliminar el audio de ambos videos
                    res.json({
                        message: 'Se eliminó el audio de ambos videos exitosamente',
                        video1WithoutAudioName,
                        video2WithoutAudioName,
                    });
                } else {
                    console.error('FFmpeg salió con un código de error para el video 2:', code);
                    res.status(500);
                    res.json({ message: 'Error al eliminar el audio del video 2' });
                }
                return next();
            });
        } else {
            console.error('FFmpeg salió con un código de error para el video 1:', code);
            res.status(500);
            res.json({ message: 'Error al eliminar el audio del video 1' });
            return next();
        }
    });
});

//curl -X POST -F "video1=@C:\Users\PAOLA\Downloads\pruebawebm.webm" -F "video2=@C:\Users\PAOLA\Downloads\pruebamp4.mp4" http://localhost:8080/api/v1/transform/mutevideos

export default server;  // Exportar el objeto del servidor