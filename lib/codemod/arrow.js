let bbt = $("<div id='btt'>DOWNLOAD LINKS</div>");
$("body").append(
    `<style>#btt { position:fixed; z-index:8999999; bottom:0;left:0; background:rgba(0,0,0,0.6); padding:10px; color:white;}</style>`
);
bbt.on("click", function() {
    let linkszz = $(".c-dl-links a");
    let dwlinks = [];
    linkszz.each(function() {
        if (
            $(this)
                .attr("href")
                .startsWith("https://rapidga")
        ) {
            dwlinks.push($(this).attr("href"));
        }
    });
    window.navigator.clipboard.writeText(JSON.stringify(dwlinks));
});
$("body").append(bbt);
