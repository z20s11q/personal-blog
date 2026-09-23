---
title: "构建单线程 Web 服务器"
order: "ch21-01-single-threaded"
chapter: 21
---
HTTP 和 TCP 都是请求-响应：客户端发起，服务器监听并应答。TCP 只规定字节如何送达；HTTP 规定请求和响应的文本格式，通常跑在 TCP 之上。标准库入口是 `std::net`。

### 监听 TCP 连接

```console
$ cargo new hello
     Created binary (application) `hello` project
$ cd hello
```

**清单 21-1** 在 `127.0.0.1:7878` 监听，每来一条流就打印。

文件：src/main.rs

```rust
use std::net::TcpListener;

fn main() {
    let listener = TcpListener::bind("127.0.0.1:7878").unwrap();

    for stream in listener.incoming() {
        let stream = stream.unwrap();

        println!("Connection established!");
    }
}
```

`TcpListener::bind` 绑定地址并返回 `Result`。端口已被占用时绑定失败；这里用 `unwrap`，失败即停。`127.0.0.1` 是本机，`7878` 是端口。

`incoming` 迭代的是连接尝试，每一项是 `Result<TcpStream>`。操作系统连接数用尽等原因会得到 `Err`。`TcpStream` 是一条已打开的连接：从中读请求，向其中写响应。`stream` 离开循环体被 drop 时，连接关闭。

浏览器一次访问可能打开多条连接（页面、favicon、预连接，或因没有响应而重试），所以会打出多条日志。此时服务器不写回数据，浏览器显示连接被重置。

```text
     Running `target/debug/hello`
Connection established!
Connection established!
Connection established!
```

无响应时浏览器会重试；`Drop` 关掉连接也会触发重试。预连接即使没有请求，`incoming` 也会给出一条 `TcpStream`。

### 读取请求

**清单 21-2** 从 `TcpStream` 读出请求行并打印。

文件：src/main.rs

```rust
use std::{
    io::{BufReader, prelude::*},
    net::{TcpListener, TcpStream},
};

fn main() {
    let listener = TcpListener::bind("127.0.0.1:7878").unwrap();

    for stream in listener.incoming() {
        let stream = stream.unwrap();

        handle_connection(stream);
    }
}

fn handle_connection(mut stream: TcpStream) {
    let buf_reader = BufReader::new(&stream);
    let http_request: Vec<_> = buf_reader
        .lines()
        .map(|result| result.unwrap())
        .take_while(|line| !line.is_empty())
        .collect();

    println!("Request: {http_request:#?}");
}
```

`BufReader<&TcpStream>` 缓冲 `Read`。`BufRead::lines` 按换行拆出 `Result<String, std::io::Error>`：数据不是合法 UTF-8，或读取失败，就是 `Err`。这里对每一行 `unwrap`。

HTTP 请求头以空行结束（连续两个换行）。`take_while` 收到空字符串就停止，得到这一次请求的各行。

```console
$ cargo run
   Compiling hello v0.1.0 (file:///projects/hello)
    Finished `dev` profile [unoptimized + debuginfo] target(s) in 0.42s
     Running `target/debug/hello`
Request: [
    "GET / HTTP/1.1",
    "Host: 127.0.0.1:7878",
    "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:99.0) Gecko/20100101 Firefox/99.0",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language: en-US,en;q=0.5",
    "Accept-Encoding: gzip, deflate, br",
    "DNT: 1",
    "Connection: keep-alive",
    "Upgrade-Insecure-Requests: 1",
    "Sec-Fetch-Dest: document",
    "Sec-Fetch-Mode: navigate",
    "Sec-Fetch-Site: none",
    "Sec-Fetch-User: ?1",
    "Cache-Control: max-age=0",
]
```

重复连接的请求行若都是 `GET /`，说明浏览器因为没收到响应而在反复请求 `/`。

### 细看 HTTP 请求

请求是文本，形状见下一块。

```text
Method Request-URI HTTP-Version CRLF
headers CRLF
message-body
```

首行是请求行：方法、URI、HTTP 版本，以 CRLF（`\r\n`）结束。打印出来是换行。`GET` 表示要数据。本章把 URI 当成 URL 即可。

`Host:` 起是头部。`GET` 没有消息体。换路径（如 `/test`）会改变请求行。

### 写回响应

```text
HTTP-Version Status-Code Reason-Phrase CRLF
headers CRLF
message-body
```

响应第一行是状态行：版本、状态码、原因短语，然后 CRLF、头部、再一个 CRLF、消息体。下面是无头部、无消息体的成功响应。

```text
HTTP/1.1 200 OK\r\n\r\n
```

状态码 200 表示成功。

**清单 21-3** 把这段响应写进流。

文件：src/main.rs

```rust
fn handle_connection(mut stream: TcpStream) {
    let buf_reader = BufReader::new(&stream);
    let http_request: Vec<_> = buf_reader
        .lines()
        .map(|result| result.unwrap())
        .take_while(|line| !line.is_empty())
        .collect();

    let response = "HTTP/1.1 200 OK\r\n\r\n";

    stream.write_all(response.as_bytes()).unwrap();
}
```

`write_all` 接受 `&[u8]`，把字节写到连接上，失败时 `unwrap`。浏览器会得到空白页。

### 返回 HTML

**清单 21-4** 放在项目根目录的示例页面。

文件：hello.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Hello!</title>
  </head>
  <body>
    <h1>Hello!</h1>
    <p>Hi from Rust</p>
  </body>
</html>
```

**清单 21-5** 把 `hello.html` 作为消息体写回。

文件：src/main.rs

```rust
use std::{
    fs,
    io::{BufReader, prelude::*},
    net::{TcpListener, TcpStream},
};
// --snip--

fn handle_connection(mut stream: TcpStream) {
    let buf_reader = BufReader::new(&stream);
    let http_request: Vec<_> = buf_reader
        .lines()
        .map(|result| result.unwrap())
        .take_while(|line| !line.is_empty())
        .collect();

    let status_line = "HTTP/1.1 200 OK";
    let contents = fs::read_to_string("hello.html").unwrap();
    let length = contents.len();

    let response =
        format!("{status_line}\r\nContent-Length: {length}\r\n\r\n{contents}");

    stream.write_all(response.as_bytes()).unwrap();
}
```

`fs::read_to_string` 读出文件。`Content-Length` 是消息体的字节长度，缺了响应就不完整。

此时忽略请求路径，任何 URI 都返回同一份 HTML。

### 按请求选择响应

只对 `GET / HTTP/1.1` 返回页面，其它请求另作处理。

**清单 21-6** 用请求行区分 `/` 和其它路径。

文件：src/main.rs

```rust
// --snip--

fn handle_connection(mut stream: TcpStream) {
    let buf_reader = BufReader::new(&stream);
    let request_line = buf_reader.lines().next().unwrap().unwrap();

    if request_line == "GET / HTTP/1.1" {
        let status_line = "HTTP/1.1 200 OK";
        let contents = fs::read_to_string("hello.html").unwrap();
        let length = contents.len();

        let response = format!(
            "{status_line}\r\nContent-Length: {length}\r\n\r\n{contents}"
        );

        stream.write_all(response.as_bytes()).unwrap();
    } else {
        // some other request
    }
}
```

`lines().next()` 只取第一行。外层 `unwrap` 处理 `Option`（没有行就停），内层 `unwrap` 处理 `Result`。

请求行等于 `GET / HTTP/1.1` 时返回 `hello.html`。其它路径还没写响应，连接在 drop 时被关掉。

**清单 21-7** 对其它请求返回 404 和错误页。

文件：src/main.rs

```rust
    // --snip--
    } else {
        let status_line = "HTTP/1.1 404 NOT FOUND";
        let contents = fs::read_to_string("404.html").unwrap();
        let length = contents.len();

        let response = format!(
            "{status_line}\r\nContent-Length: {length}\r\n\r\n{contents}"
        );

        stream.write_all(response.as_bytes()).unwrap();
    }
```

404 的原因短语是 `NOT FOUND`，消息体来自 `404.html`。

**清单 21-8** 404 页面示例。

文件：404.html

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Hello!</title>
  </head>
  <body>
    <h1>Oops!</h1>
    <p>Sorry, I don't know what you're asking for.</p>
  </body>
</html>
```

`/` 返回 `hello.html`，其它路径返回 `404.html`。

### 重构

两条分支只差状态行和文件名。

**清单 21-9** 用元组收起差异，读文件和写响应只留一处。

文件：src/main.rs

```rust
// --snip--

fn handle_connection(mut stream: TcpStream) {
    // --snip--

    let (status_line, filename) = if request_line == "GET / HTTP/1.1" {
        ("HTTP/1.1 200 OK", "hello.html")
    } else {
        ("HTTP/1.1 404 NOT FOUND", "404.html")
    };

    let contents = fs::read_to_string(filename).unwrap();
    let length = contents.len();

    let response =
        format!("{status_line}\r\nContent-Length: {length}\r\n\r\n{contents}");

    stream.write_all(response.as_bytes()).unwrap();
}
```

`let` 模式把元组拆进 `status_line` 和 `filename`。行为与清单 21-7 相同。

服务器跑在一条线程上，一次只处理一个连接。慢请求会堵住后面的连接。
