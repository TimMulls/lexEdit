using System;
using System.Configuration;
using System.IO;
using System.Web;
using System.Web.UI;
using DotNetNuke.Common.Utilities;
using LEX;

public partial class E5_ImgEdit_file_upload : Page {

    protected void Page_Load(object sender, EventArgs e)
    {
        var ImageType = Request.QueryString["ImageType"];
        var UserID = int.Parse(Request.QueryString["UserID"]);
        var SessionID = Request.QueryString["SessionID"];

        foreach (string s in Request.Files) {
            HttpPostedFile file = Request.Files[s];

            if (file == null) {
                break;
            }

            int fileSizeInBytes = file.ContentLength;
            string fileName = Request.Form["fileName"]; //Request.Headers["X-File-Name"];
            string fileExtension = "";

            if (!string.IsNullOrEmpty(fileName)) {
                fileExtension = Path.GetExtension(fileName);
            }

            // IMPORTANT! Make sure to validate uploaded file contents, size, etc. to prevent scripts being uploaded into your web app directory
            string savedFileName = Path.Combine(ConfigurationManager.AppSettings["TempDir"],
                fileName + Guid.NewGuid() + "." + fileExtension);
            file.SaveAs(savedFileName);

            AccountManagement ActMgnt = new AccountManagement(Config.GetConnectionString("ASR"));
            ActMgnt.CreateAccountImage(savedFileName, ImageType, fileName, fileName,
                SessionID, false, GetImageDir(ImageType), UserID, 0);
        }
    }

    public string GetImageDir(string imageType)
    {
        switch (imageType) {
            case "Artwork":
                return ConfigurationManager.AppSettings["ArtworkDir"];

            case "Logos":
            case "LogoCoupon":
                return ConfigurationManager.AppSettings["LogosDir"];

            case "OwnDesigns":
                return ConfigurationManager.AppSettings["OwnDesignsDir"];

            case "PersonalPhotos":
                return ConfigurationManager.AppSettings["PhotosDir"];

            case "Signatures":
                return ConfigurationManager.AppSettings["SignaturesDir"];

            case "QRCodes":
                return ConfigurationManager.AppSettings["QRCodesDir"];
        }

        throw new Exception("GetImageDir: Image Type Unknown!!! (" + imageType + ")");
    }
}