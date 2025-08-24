<%@ WebHandler Language="C#" Class="SaveImage" %>

using System;
using System.Web;

public class SaveImage : IHttpHandler
{
    public void ProcessRequest(HttpContext context)
    {
        string fileName = context.Request.QueryString["fileName"];
        fileName = System.Web.HttpContext.Current.Server.MapPath(fileName);
        System.IO.FileInfo fileInfo = new System.IO.FileInfo(fileName);
        try
        {
            if (fileInfo.Exists)
            {
                context.Response.Clear();
                context.Response.ContentType = "image/png";
                context.Response.AddHeader("Content-Disposition", "attachment; filename=\"" + fileInfo.Name + "\"");
                context.Response.AddHeader("Content-Length", fileInfo.Length.ToString());
                //context.Response.ContentType = "application/octet-stream";
                context.Response.TransmitFile(fileInfo.FullName);
                context.Response.Flush();
            }
            else
            {
                throw new Exception("File not found");
            }
        }
        catch (Exception ex)
        {
            context.Response.ContentType = "text/plain";
            context.Response.Write(ex.Message);
        }
        finally
        {
            context.Response.End();
        }
    }

    public bool IsReusable
    {
        get {
            return false;
        }
    }

}