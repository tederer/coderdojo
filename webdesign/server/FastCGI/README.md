# Wikipedias description of FCGI

FastCGI is a binary protocol for interfacing interactive programs with a web server. 
FastCGI is a variation on the earlier Common Gateway Interface (CGI); FastCGI's main 
aim is to reduce the overhead associated with interfacing the web server and CGI programs, 
allowing a server to handle more web page requests per same amount of time. 

To try FastCGI the webserver NGINX (https://www.nginx.com) can be used.

Please note that the purpose of this FastCGI (FCGI) listener is to understand/learn how FCGI works.
Its implementation is not yet finished. Still open is the handling of multiple connections.
Therefore this code should not be used in production!

# references:

FCGI specification   http://www.mit.edu/~yandros/doc/specs/fcgi-spec.html