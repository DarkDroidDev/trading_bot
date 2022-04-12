import axios from "axios";

const DOCKER_AUTH_USERNAME = process.env.DOCKER_AUTH_USERNAME;
const DOCKER_AUTH_PASSWORD = process.env.DOCKER_AUTH_PASSWORD;

export class ContainerManager {

    dockerEngineUri = process.env.DOCKER_API_ENDPOINT;
    dockerManagedContainers = process.env.DOCKER_RESTART_CONTAINER;
    dockerEndopointID = process.env.DOCKER_ENDPOINT_ID;
    dockerToken = '';

    /**
     * Esegue l'autenticazione per ottenere il token
     */
    async auth() {
        try {
            // fase 1: elenca tutti 
        
            var raw = JSON.stringify({
                "Username": DOCKER_AUTH_USERNAME,
                "Password": DOCKER_AUTH_PASSWORD
            });

            const result = await axios( {
                url: `${this.dockerEngineUri}/auth`,
                responseType:"json",
                data: raw,
                method:"POST",
                headers:{"Content-Type": "application/json"}
            });

            if (result && result.data) {
                const jwtObj = result.data;
                if (jwtObj && jwtObj.jwt) {
                    this.dockerToken = jwtObj.jwt;
                    return jwtObj.jwt;
                }
            }
        }
        catch (err) {
            console.error(err);
        }

        return null;
    }
    /**
     * Esegue il restart dei containers che sono stati configurati
     * 
     * @returns {boolean} true se i containers configurati sono stati restartati 
     */
    async restartContainers() {
        try {
            // fase 1: elenca tutti 
            const jwt = await this.auth();

            if (jwt) {
                // ottieni gli id dei container configurati
                let containerConf = this.dockerManagedContainers.indexOf(";") === -1 ? [this.dockerManagedContainers.trim()] :
                    this.dockerManagedContainers.split(";").map((val) => val.trim());

                // carica la lista dei containers

               // const containersIdsList = await this.loadContainersList(containerConf);

                if (containerConf && containerConf.length > 0) {
                    for (let i = 0; i < containerConf.length; i++) {
                        const container = containerConf[i];

                        if (containerConf) {
                            const restartResult = await this.restartContainer(container);

                            if (!restartResult) {
                                return false;
                            }
                        }
                    }
                }

                return true;
            }
        }
        catch (err) {
            console.error(err);
        }

        return false;
    }
    /**
     * Esegue il restart del singolo container
     * @param {string} jwt 
     * @param {string} containerId 
     */
    async restartContainer(containerId) {
        try {
           
            const result = await axios(
                {
                    url:  `${this.dockerEngineUri}/endpoints/${this.dockerEndopointID}/docker/containers/${containerId}/restart`,
                    method:"POST",
                    headers:{
                        "Authorization": `Bearer ${this.dockerToken}`
                    }
                });

            if (result && (result.status === 200 || result.status === 204)) {
                return true;
            }
        } catch (err) {
            console.error(err);
        }

        return false;
    }
} 