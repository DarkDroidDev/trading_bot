export default class CheckOrigin {
    /**
     * 
     * @param {Request} req 
     * @param {Response} res 
     * @param {*} next 
     * @returns 
     */
    static cors(req, res, next) {
        try {
            const domainorigin = req.headers['origin'] || "";
            const configuratedOrigin = process.env.SITEORIGIN.trim().toLowerCase();
            let origin = domainorigin;

            if (!domainorigin) {
                // imposta il primo dominio nella configurazione
                const domains = configuratedOrigin.indexOf(',') !== -1 ? configuratedOrigin.split(',') : [configuratedOrigin];
                origin = domains[0];
            }

            if (configuratedOrigin !=='*' && configuratedOrigin.indexOf(domainorigin.toLowerCase()) === -1) {
                res.status(403).json({
                    error: 403,
                    msg: 'Access denied'
                });
                return;
            } else if(configuratedOrigin === '*'){
                origin='*';
            }

            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Methods', 'OPTIONS,GET,PUT,POST,DELETE');
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-appkey-auth,x-app-auth,x-www-form-urlencoded, Origin, X-Requested-With, Accept, *');

            // intercept OPTIONS method
            if ('OPTIONS' == req.method) {
                res.sendStatus(200);
            }
            else {
                next();
            }
        } catch (err) {
            res.sendStatus(500);
        }
    }
}
