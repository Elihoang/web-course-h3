// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { getCommentsByPostId, createComment, updateComment } from '../../api/commentApi';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';

// eslint-disable-next-line react/prop-types
const CommentPost = ({ postId }) => {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingComment, setExistingComment] = useState(null);

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
        setComments(Array.isArray(postComments) ? postComments : []);

        const authToken = localStorage.getItem('authToken');
        if (authToken) {
          const decodedToken = jwtDecode(authToken);
          const userComment = postComments.find(comment => comment.userId === decodedToken.id);
          if (userComment) {
            setExistingComment(userComment);
            setCommentText(userComment.content);
          }
        }
      } catch (error) {
        toast.error('Không thể tải bình luận. Vui lòng thử lại!');
        setComments([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPostComments();
  }, [postId]);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error('Bạn cần nhập nội dung bình luận!');
      return;
    }

    setIsSubmitting(true);
    const authToken = localStorage.getItem('authToken');

    if (!authToken || authToken.split('.').length !== 3) {
      toast.error('Vui lòng đăng nhập để bình luận!');
      setIsSubmitting(false);
      return;
    }

    try {
      const commentData = {
        postId: postId,
        content: commentText,
      };

      let response;
      if (existingComment) {
        response = await updateComment(existingComment.id, commentData);
        setComments(prevComments =>
          prevComments.map(comment =>
            comment.id === existingComment.id ? response : comment
          )
        );
        toast.success('Bình luận đã được cập nhật thành công!');
      } else {
        response = await createComment(commentData);
        setComments(prevComments => [...prevComments, response]);
        setExistingComment(response);
        toast.success('Bình luận đã được gửi thành công!');
      }
    } catch (error) {
      console.error('Lỗi khi gửi bình luận:', error);
      toast.error(error.message || 'Có lỗi xảy ra khi gửi bình luận!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4">Bình luận bài viết</h3>

      {isLoading ? (
        <p className="text-center text-gray-500">Đang tải bình luận...</p>
      ) : (
        <>
          {/* Form nhập bình luận */}
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Viết bình luận của bạn..."
            className="w-full p-3 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
          />

          {/* Nút gửi bình luận */}
          <button
            onClick={handleSubmitComment}
            className={`flex items-center ${existingComment ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white py-2 px-4 rounded-lg transition duration-200`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang gửi...' : existingComment ? 'Cập nhật bình luận' : 'Gửi bình luận'}
            <Send className="ml-2" size={18} />
          </button>

          {/* Hiển thị tất cả bình luận của bài viết */}
          {comments.length > 0 ? (
            <div className="mt-8">
              <h4 className="text-xl font-semibold mb-6 border-b pb-2 text-gray-800">Bình luận của người dùng</h4>
              <div className="space-y-6">
                {comments.map((comment, idx) => (
                  <div key={idx} className="bg-gray-50 p-4 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <img
                          src={import.meta.env.VITE_API_URL + comment.userProfileImage || ' '}
                          alt="avatar"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <span className="font-medium text-gray-900">{comment.userFullName || 'Ẩn danh'}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(comment.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-gray-700 whitespace-pre-line">{comment.content}</p>
                  </div>
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