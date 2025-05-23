/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';
import { getCommentsByPostId, createComment, updateComment, deleteComment } from '../../api/commentApi';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';

const CommentPost = ({ postId }) => {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editCommentId, setEditCommentId] = useState(null);
  const authToken = localStorage.getItem('authToken');
  const currentUserId = authToken ? jwtDecode(authToken).id : null;

  const assignCommentLevels = useCallback((commentsData) => {
    const commentMap = new Map();

    commentsData.forEach(comment => {
      commentMap.set(comment.id, { ...comment, level: 0 });
    });

    const setLevel = (commentId, currentLevel) => {
      const comment = commentMap.get(commentId);
      if (!comment) return;

      if (currentLevel <= 2) {
        comment.level = currentLevel;
      } else {
        comment.level = 2;
      }

      if (comment.level === 2) {
        console.log(`Bình luận đạt level 2 - ID: ${comment.id}, Content: ${comment.content}, ParentCommentId: ${comment.parentCommentId}`);
      }

      const replies = commentsData.filter(c => c.parentCommentId === commentId);
      replies.forEach(reply => {
        setLevel(reply.id, comment.level + 1);
      });
    };

    commentsData
      .filter(comment => !comment.parentCommentId)
      .forEach(comment => {
        setLevel(comment.id, 0);
      });

    return Array.from(commentMap.values());
  }, []);

  const buildCommentTree = useCallback((commentsData) => {
    const commentsWithLevels = assignCommentLevels(commentsData);

    const sortedComments = [...commentsWithLevels].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const commentMap = new Map();
    const rootComments = [];

    sortedComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    sortedComments.forEach(comment => {
      const currentComment = commentMap.get(comment.id);
      if (!comment.parentCommentId) {
        rootComments.push(currentComment);
      } else {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies.push(currentComment);
        }
      }
    });

    rootComments.forEach(comment => {
      comment.replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    console.log('Cây bình luận chi tiết:', JSON.stringify(rootComments, null, 2));
    return rootComments;
  }, [assignCommentLevels]);

  useEffect(() => {
    const fetchPostComments = async () => {
      if (!postId) {
        toast.error('Không có ID bài viết!');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const postComments = await getCommentsByPostId(postId);
        console.log('Dữ liệu API:', JSON.stringify(postComments, null, 2));
        if (!Array.isArray(postComments)) {
          setComments([]);
          return;
        }
        setComments(buildCommentTree(postComments));
      } catch (error) {
        toast.error(error.message || 'Không thể tải bình luận. Vui lòng thử lại!');
        setComments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostComments();
  }, [postId, buildCommentTree]);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error('Bạn cần nhập nội dung bình luận!');
      return;
    }

    if (!authToken || authToken.split('.').length !== 3) {
      toast.error('Vui lòng đăng nhập để bình luận!');
      return;
    }

    setIsSubmitting(true);
    try {
      const commentData = { postId, content: commentText };
      const response = await createComment(commentData);
      setComments(prev => [...prev, { ...response, replies: [], level: 0 }]);
      toast.success('Bình luận đã được gửi thành công!');
      setCommentText('');
    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra khi gửi bình luận!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditComment = async () => {
    if (!commentText.trim()) {
      toast.error('Bạn cần nhập nội dung để chỉnh sửa!');
      return;
    }

    if (!authToken || authToken.split('.').length !== 3) {
      toast.error('Vui lòng đăng nhập để chỉnh sửa!');
      return;
    }

    setIsSubmitting(true);
    try {
      const commentData = { content: commentText };
      const response = await updateComment(editCommentId, commentData);
      setComments(prev =>
        prev.map(comment => {
          if (comment.id === editCommentId) return { ...response, replies: comment.replies, level: comment.level };
          return {
            ...comment,
            replies: (comment.replies || []).map(reply =>
              reply.id === editCommentId ? { ...response, replies: reply.replies, level: reply.level } : reply
            ),
          };
        })
      );
      toast.success('Bình luận đã được chỉnh sửa thành công!');
      setEditCommentId(null);
      setCommentText('');
    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra khi chỉnh sửa bình luận!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!authToken || authToken.split('.').length !== 3) {
      toast.error('Vui lòng đăng nhập để xóa bình luận!');
      return;
    }

    setIsSubmitting(true);
    try {
      await deleteComment(commentId);
      setComments(prev =>
        prev
          .filter(comment => comment.id !== commentId)
          .map(comment => ({
            ...comment,
            replies: (comment.replies || []).filter(reply => reply.id !== commentId),
          }))
      );
      toast.success('Bình luận và các phản hồi đã được xóa thành công!');
    } catch (error) {
      toast.error(error.message || 'Có lỗi xảy ra khi xóa bình luận!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const countAllReplies = (comment) => {
    let count = (comment.replies || []).length;
    for (const reply of (comment.replies || [])) {
      count += countAllReplies(reply);
    }
    return count;
  };

  const flattenLevel2Comments = (comments) => {
    const flatList = [];
    const collectLevel2 = (comment) => {
      if (comment.level >= 2) {
        flatList.push(comment);
      }
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(reply => collectLevel2(reply));
      }
    };
    comments.forEach(collectLevel2);
    return flatList;
  };

  const RenderComment = ({ comment, level = 0 }) => {
    const isOwner = currentUserId === comment.userId;
    const [isReplying, setIsReplying] = useState(false);
    const [localReplyText, setLocalReplyText] = useState('');
    const displayLevel = Math.min(comment.level || level, 2);
    const totalReplies = countAllReplies(comment);
    const [showReplies, setShowReplies] = useState(comment.level < 2 ? false : true);

    // Thu thập tất cả bình luận level 2 nếu comment là level 1
    const level2Comments = comment.level === 1 ? flattenLevel2Comments(comment.replies || []) : [];

    const handleSubmitReply = async () => {
      if (!localReplyText.trim()) {
        toast.error('Bạn cần nhập nội dung trả lời!');
        return;
      }

      if (!authToken || authToken.split('.').length !== 3) {
        toast.error('Vui lòng đăng nhập để trả lời!');
        return;
      }

      setIsSubmitting(true);
      try {
        const replyData = { postId, content: localReplyText, parentCommentId: comment.id };
        const response = await createComment(replyData);
        const newCommentLevel = comment.level < 2 ? comment.level + 1 : 2;
        if (newCommentLevel === 2) {
          console.log(`Bình luận mới đạt level 2 - ID: ${response.id}, Content: ${response.content}, ParentCommentId: ${comment.id}`);
        }
        setComments(prev =>
          prev.map(c => {
            if (c.id === comment.id) {
              return { ...c, replies: [...(c.replies || []), { ...response, level: newCommentLevel, replies: [] }] };
            }
            return {
              ...c,
              replies: (c.replies || []).map(r =>
                r.id === comment.id
                  ? { ...r, replies: [...(r.replies || []), { ...response, level: newCommentLevel, replies: [] }] }
                  : r
              ),
            };
          })
        );
        toast.success('Trả lời đã được gửi thành công!');
        setLocalReplyText('');
        setShowReplies(true);
      } catch (error) {
        toast.error(error.message || 'Có lỗi xảy ra khi gửi trả lời!');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className={`ml-${displayLevel * 12} pb-4`}>
        <div className="flex items-start space-x-3 mt-2">
          <img
            src={comment.userProfileImage ? `${import.meta.env.VITE_API_URL}${comment.userProfileImage}` : 'https://i.pravatar.cc/150'}
            alt={comment.userFullName || 'Ẩn danh'}
            className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
            onError={(e) => (e.target.src = 'https://i.pravatar.cc/150')}
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-gray-800">{comment.userFullName || 'Ẩn danh'}</p>
              {isOwner && !editCommentId && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditCommentId(comment.id);
                      setCommentText(comment.content);
                    }}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Bạn có chắc muốn xóa bình luận này? Tất cả phản hồi cũng sẽ bị xóa.')) {
                        handleDeleteComment(comment.id);
                      }
                    }}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Xóa
                  </button>
                </div>
              )}
            </div>
            <p className="text-gray-700 whitespace-pre-line mt-1">{comment.content}</p>
            <p className="text-sm text-gray-500 mt-2">
              {new Date(comment.createdAt).toLocaleString('vi-VN')}
            </p>
            <button
              onClick={() => setIsReplying(!isReplying)}
              className="mt-2 text-blue-500 hover:text-blue-700 text-sm"
            >
              {isReplying ? 'Hủy trả lời' : 'Trả lời'}
            </button>
            {totalReplies > 0 && comment.level < 2 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="mt-2 ml-4 text-blue-500 hover:text-blue-700 text-sm"
              >
                {showReplies ? `Ẩn câu trả lời` : `Xem ${totalReplies} câu trả lời`}
              </button>
            )}
          </div>
        </div>

        {isReplying && (
          <div className="ml-12 mt-2">
            <textarea
              value={localReplyText}
              onChange={(e) => setLocalReplyText(e.target.value)}
              placeholder="Viết trả lời của bạn..."
              className="w-full p-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
              rows="2"
            />
            <button
              onClick={handleSubmitReply}
              className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-lg transition duration-200"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang gửi...' : 'Gửi trả lời'}
            </button>
            <button
              onClick={() => setIsReplying(false)}
              className="ml-2 text-gray-500 hover:text-gray-700"
            >
              Hủy
            </button>
          </div>
        )}

        {/* Hiển thị replies chỉ khi level < 1 (root comments) hoặc level = 0 */}
        {comment.level === 0 && showReplies && comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-2">
            {comment.replies.map(reply => (
              <RenderComment key={reply.id} comment={reply} level={reply.level || level + 1} />
            ))}
          </div>
        )}

        {/* Hiển thị tất cả bình luận level 2 trở đi thẳng hàng khi level = 1 */}
        {comment.level === 1 && level2Comments.length > 0 && showReplies && (
          <div className="mt-2 space-y-2">
            {level2Comments.map(reply => (
              <div key={reply.id} className="ml-24 pb-4">
                <div className="flex items-start space-x-3 mt-2">
                  <img
                    src={reply.userProfileImage ? `${import.meta.env.VITE_API_URL}${reply.userProfileImage}` : 'https://i.pravatar.cc/150'}
                    alt={reply.userFullName || 'Ẩn danh'}
                    className="w-10 h-10 rounded-full object-cover border-2 border-pink-500"
                    onError={(e) => (e.target.src = 'https://i.pravatar.cc/150')}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-800">{reply.userFullName || 'Ẩn danh'}</p>
                      {isOwner && !editCommentId && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditCommentId(reply.id);
                              setCommentText(reply.content);
                            }}
                            className="text-blue-500 hover:text-blue-700 text-sm"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Bạn có chắc muốn xóa bình luận này? Tất cả phản hồi cũng sẽ bị xóa.')) {
                                handleDeleteComment(reply.id);
                              }
                            }}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            Xóa
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-700 whitespace-pre-line mt-1">{reply.content}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {new Date(reply.createdAt).toLocaleString('vi-VN')}
                    </p>
                    <button
                      onClick={() => setIsReplying(!isReplying)}
                      className="mt-2 text-blue-500 hover:text-blue-700 text-sm"
                    >
                      {isReplying ? 'Hủy trả lời' : 'Trả lời'}
                    </button>
                  </div>
                </div>
                {isReplying && (
                  <div className="ml-12 mt-2">
                    <textarea
                      value={localReplyText}
                      onChange={(e) => setLocalReplyText(e.target.value)}
                      placeholder="Viết trả lời của bạn..."
                      className="w-full p-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                      rows="2"
                    />
                    <button
                      onClick={handleSubmitReply}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded-lg transition duration-200"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Đang gửi...' : 'Gửi trả lời'}
                    </button>
                    <button
                      onClick={() => setIsReplying(false)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-8 p-4 bg-white rounded-xl shadow-md">
      <h3 className="text-xl font-bold text-pink-500 mb-4">Bình luận bài viết</h3>

      {isLoading ? (
        <p className="text-center text-gray-500">Đang tải bình luận...</p>
      ) : (
        <>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Viết bình luận của bạn..."
            className="w-full p-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
            rows="4"
          />
          <button
            onClick={editCommentId ? handleEditComment : handleSubmitComment}
            className={`${
              editCommentId ? 'bg-pink-600 hover:bg-pink-700' : 'bg-blue-600 hover:bg-blue-700'
            } text-white py-2 px-4 rounded-lg transition duration-200`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang xử lý...' : editCommentId ? 'Lưu chỉnh sửa' : 'Gửi bình luận'}
          </button>

          {comments.length > 0 ? (
            <div className="mt-6">
              <h4 className="font-semibold text-lg text-gray-700 mb-4">Bình luận của người dùng:</h4>
              <div className="space-y-4">
                {comments.map((comment, index) => (
                  <React.Fragment key={comment.id}>
                    {index > 0 && <hr className="border-gray-200" />}
                    <RenderComment comment={comment} level={comment.level || 0} />
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 mt-4">Chưa có bình luận nào.</p>
          )}
        </>
      )}
    </div>
  );
};

export default CommentPost;