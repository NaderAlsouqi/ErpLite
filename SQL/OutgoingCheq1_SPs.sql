-- ═══════════════════════════════════════════════════════════════════════════
--  شيكات صادرة أول مرة  –  Stored Procedures  (cheq2-based)
--  Opening entries: Trans_Num = 0  |  keyed by doc_num + v_TYPE + myear
--  Run this entire script once against your application database.
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── 1. Paginated list ───────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE SP_GetOutgoingCheq1List
    @MyYear     INT,
    @VType      INT,
    @PageNumber INT = 1,
    @PageSize   INT = 20
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

    SELECT
        doc_num                                AS DocNum,
        v_TYPE                                 AS VType,
        myear                                  AS MyYear,
        CONVERT(VARCHAR(10), MIN(date2), 120)  AS [Date],
        MAX(Status)                            AS Sts,
        SUM(amt)                               AS Total,
        COUNT(*)                               AS LineCount
    FROM cheq2
    WHERE Trans_Num = 0
      AND v_TYPE    = @VType
      AND myear     = @MyYear
    GROUP BY doc_num, v_TYPE, myear
    ORDER BY doc_num DESC
    OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

    SELECT COUNT(DISTINCT doc_num)
    FROM cheq2
    WHERE Trans_Num = 0
      AND v_TYPE    = @VType
      AND myear     = @MyYear;
END
GO


-- ─── 2. Header (first row of a document) ────────────────────────────────────
CREATE OR ALTER PROCEDURE SP_GetOutgoingCheq1Header
    @DocNum INT,
    @MyYear INT,
    @VType  INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP 1
        c.doc_num                            AS DocNum,
        c.v_TYPE                             AS VType,
        c.myear                              AS MyYear,
        ISNULL(c.BR_NO, 0)                   AS BrNo,
        CONVERT(VARCHAR(10), c.date2, 120)   AS [Date],
        CAST(ISNULL(c.acc, 0) AS INT)        AS AccNo,
        a.[name]                             AS AccName,
        ISNULL(c.cur, 1)                     AS CurNo,
        ISNULL(c.rate, 1)                    AS Rate,
        ISNULL(c.Status, 0)                  AS Sts,
        NULL                                 AS UserName
    FROM cheq2 c
    LEFT JOIN accf a ON a.[no] = c.acc
    WHERE c.Trans_Num = 0
      AND c.doc_num   = @DocNum
      AND c.v_TYPE    = @VType
      AND c.myear     = @MyYear;
END
GO


-- ─── 3. Lines (all cheque rows for a document) ──────────────────────────────
CREATE OR ALTER PROCEDURE SP_GetOutgoingCheq1Lines
    @DocNum INT,
    @MyYear INT,
    @VType  INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.cheq_num                            AS CheqNum,
        CONVERT(VARCHAR(10), c.date1, 120)    AS Date1,
        ISNULL(c.Bank_num, 0)                 AS BankNum,
        b.Bank                                AS BankName,
        c.amt                                 AS Amt,
        CAST(ISNULL(c.AccNo, 0) AS INT)       AS CustAcc,
        a.[name]                              AS CustAccName,
        c.person                              AS Draw
    FROM cheq2 c
    LEFT JOIN banks b ON b.bank_num = c.Bank_num
    LEFT JOIN accf  a ON a.[no]     = c.AccNo
    WHERE c.Trans_Num = 0
      AND c.doc_num   = @DocNum
      AND c.v_TYPE    = @VType
      AND c.myear     = @MyYear
    ORDER BY c.ChId;
END
GO


-- ─── 4. Next available document number ──────────────────────────────────────
CREATE OR ALTER PROCEDURE SP_GetNextOutgoingCheq1DocNum
    @MyYear INT,
    @VType  INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ISNULL(MAX(doc_num), 0) + 1
    FROM cheq2
    WHERE Trans_Num = 0
      AND v_TYPE    = @VType
      AND myear     = @MyYear;
END
GO


-- ─── 5. Navigation (min / max doc numbers) ──────────────────────────────────
CREATE OR ALTER PROCEDURE SP_GetOutgoingCheq1Navigation
    @MyYear INT,
    @VType  INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ISNULL(MIN(doc_num), 0) AS MinDocNum,
        ISNULL(MAX(doc_num), 0) AS MaxDocNum
    FROM cheq2
    WHERE Trans_Num = 0
      AND v_TYPE    = @VType
      AND myear     = @MyYear;
END
GO


-- ─── 6. Adjacent document number (PREV / NEXT) ──────────────────────────────
CREATE OR ALTER PROCEDURE SP_GetAdjacentOutgoingCheq1DocNum
    @CurrentDocNum INT,
    @MyYear        INT,
    @VType         INT,
    @Direction     VARCHAR(4) = 'NEXT'
AS
BEGIN
    SET NOCOUNT ON;

    IF @Direction = 'PREV'
        SELECT MAX(doc_num) AS DocNum
        FROM cheq2
        WHERE Trans_Num = 0
          AND v_TYPE    = @VType
          AND myear     = @MyYear
          AND doc_num   < @CurrentDocNum;
    ELSE
        SELECT MIN(doc_num) AS DocNum
        FROM cheq2
        WHERE Trans_Num = 0
          AND v_TYPE    = @VType
          AND myear     = @MyYear
          AND doc_num   > @CurrentDocNum;
END
GO


-- ─── 7. Delete all rows of a document ───────────────────────────────────────
CREATE OR ALTER PROCEDURE SP_DeleteOutgoingCheq1Document
    @DocNum INT,
    @MyYear INT,
    @VType  INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM cheq2
    WHERE Trans_Num = 0
      AND doc_num   = @DocNum
      AND v_TYPE    = @VType
      AND myear     = @MyYear;
END
GO


-- ─── 8. Insert a single cheque row into cheq2 ───────────────────────────────
--  Mapping:
--    @AccNo   (header main account)  → acc      (debit side)
--    @CustAcc (line credit account)  → AccNo & custacc  (credit side)
--    @Draw    (drawer name)          → ben & person
--    @Sts     (header status)        → Status
CREATE OR ALTER PROCEDURE SP_InsertOutgoingCheq1Line
    @DocNum  INT,
    @VType   INT,
    @Date2   VARCHAR(20),    -- document date
    @MyYear  INT,
    @BrNo    INT,
    @CheqNum NVARCHAR(20),
    @Date1   VARCHAR(20),    -- cheque date
    @Amt     DECIMAL(18,4),
    @BankNum INT,
    @Draw    NVARCHAR(200),
    @Rate    DECIMAL(10,4),
    @CurNo   INT,
    @Sts     INT,
    @AccNo   INT,            -- main debit account  → acc
    @CustAcc INT,            -- credit / customer account → AccNo & custacc
    @ChId    INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO cheq2
        (Trans_Num, v_TYPE, doc_num, cheq_num, date1, date2, amt, ben,
         cur, rate, AccNo, acc, ChId, IsDeleted, Cheq_Flage,
         Bank_num, myear, custacc, BR_NO, Status, person)
    VALUES
        (0, @VType, @DocNum, @CheqNum, @Date1, @Date2, @Amt, @Draw,
         @CurNo, @Rate, @CustAcc, @AccNo, @ChId, 0, 1,
         @BankNum, @MyYear, @CustAcc, @BrNo, @Sts, @Draw);
END
GO
