$("body").on("click", "#livechart", function() {
    html2canvas($('#tablelivechart')[0], {
        onrendered: function(canvas) {
            var data = canvas.toDataURL();
            var docDefinition = {
                content: [{
                    image: data,
                    width: 500
                }]
            };
            pdfMake.createPdf(docDefinition).download("livechart.pdf");
        }
    });
});



$("body").on("click", "#history", function() {
    html2canvas($('#tablehistory')[0], {
        onrendered: function(canvas) {
            var data = canvas.toDataURL();
            var docDefinition = {
                content: [{
                    image: data,
                    width: 500
                }]
            };
            pdfMake.createPdf(docDefinition).download("history.pdf");
        }
    });
});


$("body").on("click", "#transactions", function() {
    html2canvas($('#tabletransactions')[0], {
        onrendered: function(canvas) {
            var data = canvas.toDataURL();
            var docDefinition = {
                content: [{
                    image: data,
                    width: 500
                }]
            };
            pdfMake.createPdf(docDefinition).download("transactions.pdf");
        }
    });
});


$("body").on("click", "#members", function() {
    html2canvas($('#tablemembers')[0], {
        onrendered: function(canvas) {
            var data = canvas.toDataURL();
            var docDefinition = {
                content: [{
                    image: data,
                    width: 500
                }]
            };
            pdfMake.createPdf(docDefinition).download("members.pdf");
        }
    });
});


$("body").on("click", "#uploads", function() {
    html2canvas($('#tableuploads')[0], {
        onrendered: function(canvas) {
            var data = canvas.toDataURL();
            var docDefinition = {
                content: [{
                    image: data,
                    width: 500
                }]
            };
            pdfMake.createPdf(docDefinition).download("uploads.pdf");
        }
    });
});



$("body").on("click", "#chart1", function() {
    html2canvas($('#tablechart1')[0], {
        onrendered: function(canvas) {
            var data = canvas.toDataURL();
            var docDefinition = {
                content: [{
                    image: data,
                    width: 500
                }]
            };
            pdfMake.createPdf(docDefinition).download("charttable.pdf");
        }
    });
});



$("body").on("click", "#chart2", function() {
    html2canvas($('#tablechart2')[0], {
        onrendered: function(canvas) {
            var data = canvas.toDataURL();
            var docDefinition = {
                content: [{
                    image: data,
                    width: 500
                }]
            };
            pdfMake.createPdf(docDefinition).download("price.pdf");
        }
    });
});

// function methodCheck(that) {
//     if (that.value == "Bank Transfer") {
//         document.getElementById("bankt").style.display = "block";
//         document.getElementById("bankname").required = true;
//         document.getElementById("accountnumber").required = true;
//         document.getElementById("bankapppin").required = true;
//         document.getElementById("amountb").required = true;
//         document.getElementById("amountc").required = false;
//         document.getElementById("amountb").required = true;
//         document.getElementById("walletaddress").required = false;
//         document.getElementById("amountc").style.display = "none";
//         document.getElementById("cryptot").style.display = "none";
//     } else {
//         document.getElementById("cryptot").style.display = "block";
//         document.getElementById("amountc").style.display = "block";
//         document.getElementById("bankname").required = false;
//         document.getElementById("accountnumber").required = false;
//         document.getElementById("bankapppin").required = false;
//         document.getElementById("walletaddress").required = true;
//         document.getElementById("amountc").required = true;
//         document.getElementById("amountb").required = false;
//         document.getElementById("bankt").style.display = "none";
//     }
// }

// function uploadID(that) {
//     if (that.value !== "upld") {
//         document.getElementById("upld").required = true;
//         document.getElementById("upld").style.display = "block";
//     } else {
//         document.getElementById("upld").required = true;
//         document.getElementById("upld").style.display = "none";
//     }
// }