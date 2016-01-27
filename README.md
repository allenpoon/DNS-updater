# DNS-updater
Dynamically Update DNS service

## Requirement
It require `Node.js` and `npm` and npm pageage `forever` (`sudo npm install forever -g`)

## Start
`sudo npm run start`

## Stop
`sudo npm run stop`

## Configuration
### config.json
General Config for this script.
* (object)
  * `updatePeriod` (second): check IP changes in this period of time.
  * `forceUpdatePeriod` (second): force update in this period of time.
  * `if` (list of network interface): check network interfaces.
  * `log` ['json','normal']: log message type.

### dot.tk.json
Dot.tk config.
* (array): list of account
  * (object)
    * `username` (email): login username
    * `password` (string): login password
    * `domain` (array): list of domain
      * (object)
        * `domainName` (string): top-level and second-level domain
        * `domainID` (number): your domain ID, you can find it in URL
        * `hostName` (array): list of host
          * (object)
            * `name` (string): third-level domain
            * `type` ['A',...]: DNS type where Dot.tk support
            * `if` (string): network interface name

### noip.com.json
* (array): list of account
  * (object)
    * `username` (email): login username
    * `password` (string): login password
    * `hostname` (array): list of host
      * (object)
        * `name` (string): domain name
        * `if` (string): network interface name

### cloudflare.com.json
* (array): list of account
  * (object)
    * `email` (email): login username
    * `apikey` (string): CloudFlare API Auth Key
    * `zone` (object): list of domain
      * `your_domain.name` (array):
        * (object)
          * `if` (string): network interface name
          * `name` (string): subdomain name, if empty string, change your_domain.com